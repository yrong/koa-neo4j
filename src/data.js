/**
 * Created by keyvan on 8/16/16.
 */

import {v1 as neo4j} from 'neo4j-driver';
import fs from 'file-system';
import chalk from 'chalk';
import parser from 'parse-neo4j';
import {parseNeo4jInts} from './preprocess';

class Neo4jConnection {
    constructor({boltUrl, user, password} = {}) {
        this.queries = {};

        this.driver = neo4j.driver(boltUrl, neo4j.auth.basic(user, password));
        const session = this.driver.session();
        this.initialized = session.run('RETURN "Neo4j instance successfully connected."')
            .then((result) => {
                console.log(chalk.green(parser.parse(result)));
                session.close();
            })
            .catch(error => {
                console.error(
                    chalk.red('Error connecting to the Neo4j instance, check connection options'));
                console.log(error);
                throw error;
            });
    }

    addCypherQueryFile(cypherQueryFilePath) {
        this.queries[cypherQueryFilePath] = fs.readFileSync(cypherQueryFilePath, 'utf8');
    }

    executeCypher(cypherQueryFilePath, queryParams, pathIsQuery = false) {
        return new Promise((resolve, reject) => {
            if (!this.queries[cypherQueryFilePath])
                this.addCypherQueryFile(cypherQueryFilePath);

            let query = cypherQueryFilePath;
            if (!pathIsQuery)
                query = this.queries[cypherQueryFilePath];
            const session = this.driver.session();

            session.run(query, queryParams)
                .then(result => {
                    resolve(result);
                    session.close();
                })
                .catch(error => {
                    error = error.fields ? JSON.stringify(error.fields[0]) : String(error);
                    reject(`error while executing Cypher: ${error}`);
                });
        })
            .then(parser.parse);
    }
}

class Hook {
    constructor(functionOrArrayOfFunctions, procedureName, hookName, timeout = 4000) {
        this.timeout = timeout;
        this.name = hookName;
        this.procedureName = procedureName;
        if (!Array.isArray(functionOrArrayOfFunctions))
            if (typeof functionOrArrayOfFunctions === 'function')
                functionOrArrayOfFunctions = [functionOrArrayOfFunctions];
            else
                throw new Error('hook should be function or array of functions');
        this.phases = [];
        this.context = {};
        for (const func of functionOrArrayOfFunctions)
            if (typeof func === 'function')
                this.phases.push(this.asyncify(func));
            else
                throw new Error(`element ${func} in array passed as ${this.procedureName} ` +
                'lifecycle is not a function');

        this.execute = (...args) => {
            let next = Promise.resolve(this.phases[0](...args));
            const rest = args.slice(1);
            for (let i =  1; i < this.phases.length; i++)
                next = Promise.all([this.phases[i], next, rest])
                    .then(([phase, response, rest]) => phase(response, ...rest));
            return next;
        };
    }

    asyncify(func) {
        return (...args) => Promise.race([
            Promise.resolve(func.apply(this.context, args)),
            new Promise((resolve, reject) => setTimeout(() => reject('TimeOutError'), this.timeout))
        ])
            .catch((error) => {
                if (error === 'TimeOutError')
                    throw new Error(`${this.name} lifecycle of '${this.procedureName}' timed out, `
                            + `no response after ${this.timeout / 1000} seconds`);
                if (typeof error === 'string')
                    error += `, in ${this.name} lifecycle of '${this.procedureName}'`;
                else
                    error.message += `, in ${this.name} lifecycle of '${this.procedureName}'`;
                throw error;
            });
    }
}


const createProcedure = (neo4jConnection, {cypherQueryFile, cypher, check = (params, user) => true,
    preProcess = params => params, postProcess = result => result, postServe = result => result,
    name = 'createProcedure'} = {}) => {
    const checkHook = new Hook(check, name, 'check');
    const preProcessHook = new Hook(preProcess, name, 'preProcess');
    let cypherExecutionHook;
    let paramsResultExecutionHook;
    if (cypherQueryFile || cypher)
        cypherExecutionHook = new Hook(
            (params, cypherQueryFile) =>
                neo4jConnection.executeCypher(params.cypher || cypherQueryFile,
                    params, params.cypher),
            name, 'cypherExecution');
    else
        paramsResultExecutionHook = new Hook(
            params => {
                if (Array.isArray(params.result))
                    return Promise.all(params.result);
                else if (params.result)
                    return Promise.resolve(params.result);
                return Promise.reject(
                    new Error("neither 'cypherQueryFile' nor 'params.result' were present"));
            }, name, 'paramsResultExecution');

    const postProcessHook = new Hook(postProcess, name, 'postProcess');
    const postServeHook = new Hook(postServe, name, 'postServe', 10000);

    return (params, ctx) => {
        const response = checkHook.execute(params, ctx)
            .then(checkPassed => {
                if (!checkPassed)
                    throw new Error('Check lifecycle hook did not pass');
                return [params, ctx];
            })
            .then(([params, ctx]) => Promise.all([
                preProcessHook.execute(params, ctx),
                ctx
            ]))
            .then(([params, ctx]) => Promise.all([
                parseNeo4jInts('id', 'skip', 'limit')(params),
                ctx
            ]))
            .then(([params, ctx]) => Promise.all([
                cypherQueryFile ? cypherExecutionHook.execute(params, cypherQueryFile)
                    : paramsResultExecutionHook.execute(params),
                params,
                ctx
            ]))
            .then(([result, params, ctx]) => Promise.all([
                postProcessHook.execute(result, params, ctx),
                params,
                ctx
            ]));

        response
            .catch(error => [])
            .then(([result, params, ctx]) => {
                if (result || params || ctx)
                    return postServeHook.execute(result, params, ctx);
            })
            .catch(error => {
                console.error(chalk.red(`Error in postServe of '${name}'`));
                console.log(error);
            });
        return response.then(([result, params, ctx]) => result);
    };
};

class API {
    constructor(neo4jConnection, {method, route, allowedRoles = [], procedure,
        cypherQueryFile, check, preProcess, postProcess, postServe} = {}) {
        if (typeof procedure === 'function')
            this.invoke = procedure;
        else
            this.invoke = createProcedure(neo4jConnection,
                {cypherQueryFile, check, preProcess, postProcess, postServe, name: route});

        this.method = method;
        this.route = route;
        this.allowedRoles = allowedRoles;
        this.requiresJwtAuthentication = allowedRoles &&
            Array.isArray(allowedRoles) && allowedRoles.length > 0;
    }
}

export {Neo4jConnection, createProcedure, API};
