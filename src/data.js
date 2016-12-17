/**
 * Created by keyvan on 8/16/16.
 */

import {v1 as neo4j} from 'neo4j-driver';
import fs from 'file-system';
import chai from 'chai';
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
        if (typeof functions === 'function' || functions instanceof Procedure)
                functions = [functions];
            else
                throw new Error('hook should be function or array of functions');
        this.phases = [];
        this.context = {};
        for (let func of functions) {
            if (func instanceof Procedure)
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
                    return response;
                }),
            new Promise((resolve, reject) => setTimeout(() => reject(
                `operation timed out, no response after ${this.timeout / 1000} seconds`
            ), this.timeout))
        ])
            .catch((error) => {
                const complementary = `, in ${this.name} lifecycle of '${this.procedureName}'`;
                if (typeof error === 'string')
                    error += complementary;
                else
                    error.message += complementary;
                throw error;
            });
    }
}

const createProcedure = (neo4jConnection, options) => {
    const procedure = new Procedure(options);
    const checkHook = new Hook(procedure.check, neo4jConnection,
        procedure.name, 'check', procedure.timeout);
    const preProcessHook = new Hook(procedure.preProcess, neo4jConnection,
        procedure.name, 'preProcess', procedure.timeout);
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
        } else
            result = Promise.reject(
                new Error("none of 'params.result', 'params.cypher' or " +
                    "'cypherQueryFile' were present"));
        return {result, paramsResult, paramsCypher};
    }, neo4jConnection, procedure.name, 'execution', procedure.timeout);

    const postProcessHook = new Hook(procedure.postProcess, neo4jConnection,
        procedure.name, 'postProcess', procedure.timeout);
    const postServeHook = new Hook(procedure.postServe, neo4jConnection,
        procedure.name, 'postServe', procedure.timeout * 3);

    return (params, ctx) => {
        const response = checkHook.execute(params, ctx)
            .then(checkPassed => {
                if (!checkPassed)
                    throw new Error(`Check lifecycle hook of ${procedure.name} did not pass`);
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
                executionHook.execute(params, procedure.cypherQueryFile),
                params,
                ctx
            ]))
            .then(([{result, paramsResult, paramsCypher}, params, ctx]) => {
                if (paramsResult)
                    delete params.result;
                if (paramsCypher)
                    delete params.cypher;
                return Promise.all([result, params, ctx]);
            })
            .then(([result, params, ctx]) => Promise.all([
                postProcessHook.execute(result, params, ctx),
                params,
                ctx
            ]));

        response
            .then(([result, params, ctx]) => postServeHook.execute(result, params, ctx))
            .catch(error => console.dir(error));
        return response.then(([result, params, ctx]) => result);
    };
};

class API {
    constructor(neo4jConnection, options) {
        if (typeof options.procedure === 'function')
            this.invoke = options.procedure;
        else
            this.invoke = createProcedure(neo4jConnection, options);

        chai.assert.typeOf(options.method, 'string');
        chai.assert.typeOf(options.route, 'string');

        this.method = options.method;
        this.route = options.route;
        this.allowedRoles = options.allowedRoles || [];
        this.requiresJwtAuthentication = this.allowedRoles &&
            Array.isArray(this.allowedRoles) && this.allowedRoles.length > 0;
    }
}

export {Neo4jConnection, Procedure, createProcedure, API};
