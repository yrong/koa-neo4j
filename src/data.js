/**
 * Created by keyvan on 8/16/16.
 */

import {v1 as neo4j} from 'neo4j-driver';
import fs from 'file-system';
import chalk from 'chalk';
import parser from 'parse-neo4j';
import {parseNeo4jInts} from './preprocess';
import {Procedure} from './procedure';

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
            if (!pathIsQuery && !this.queries[cypherQueryFilePath])
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
    constructor(functions, neo4jConnection,
                procedureName, hookName, timeout = 4000) {
        this.timeout = timeout;
        this.name = hookName;
        this.procedureName = procedureName;
        if (!Array.isArray(functions))
        // TODO instanceof not working due to webpack!
        // if (typeof functions === 'function' || functions instanceof Procedure)
            if (typeof functions === 'function' || functions.isProcedure)
                functions = [functions];
            else
                throw new Error('hook should be function or array of functions');
        this.phases = [];
        this.context = {};
        for (let func of functions) {
            // TODO instanceof not working due to webpack!
            // if (func instanceof Procedure)
            if (func.isProcedure)
                func = createProcedure(neo4jConnection, func);
            else if (typeof func !== 'function')
                throw new Error(`element ${func} passed as ${this.procedureName} lifecycle ` +
                    "is neither a 'function' nor a 'procedure'");
            this.phases.push(this.asyncify(func));
        }

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
            Promise.resolve(func.apply(this.context, args))
                .then(response => {
                    if (Array.isArray(response))
                        return Promise.all(response);
                    if (typeof response !== 'undefined')
                        return response;
                    if (typeof args[0] === 'object' && !Array.isArray(args[0]))
                        return args[0];
                    throw new Error('have you forgotten to return in the previous function ' +
                        "in the pipe? Hook's first argument not in correct format");
                }),
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

const createProcedure = (neo4jConnection, procedure) => {
    const options = new Procedure(procedure);
    const checkHook = new Hook(options.check, neo4jConnection, options.name, 'check');
    const preProcessHook = new Hook(options.preProcess, neo4jConnection,
        options.name, 'preProcess');
    const executionHook = new Hook((params, cypherQueryFile) => {
        let result, paramsResult, paramsCypher;
        if (typeof params.result !== 'undefined') {
            if (Array.isArray(params.result))
                result = Promise.all(params.result);
            else
                result = Promise.resolve(params.result);
            paramsResult = true;
        }
        else if (params.cypher || cypherQueryFile) {
            result = neo4jConnection.executeCypher(params.cypher || cypherQueryFile,
                params, params.cypher);
            paramsCypher = true;
        }
        else
            result = Promise.reject(
                new Error("none of 'params.result', 'params.cypher' and " +
                    "'cypherQueryFile' were present"));
        return {result, paramsResult, paramsCypher};
    }, neo4jConnection, options.name, 'execution');

    const postProcessHook = new Hook(options.postProcess, neo4jConnection,
        options.name, 'postProcess');
    const postServeHook = new Hook(options.postServe, neo4jConnection,
        options.name, 'postServe', 10000);

    return (params, ctx) => {
        const response = checkHook.execute(params, ctx)
            .then(checkPassed => {
                if (!checkPassed)
                    throw new Error(`Check lifecycle hook of ${options.name} did not pass`);
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
                executionHook.execute(params, options.cypherQueryFile),
                params,
                ctx
            ]))
            .then(([{result, paramsResult, paramsCypher}, params, ctx]) => {
                if (paramsResult)
                    delete params.result;
                if (paramsCypher)
                    delete params.cypher;
                console.log({result, paramsResult, paramsCypher})
                return Promise.all([result, params, ctx]);
            })
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
                console.error(chalk.red(`Error in postServe of '${options.name}'`));
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

export {Neo4jConnection, Procedure, createProcedure, API};
