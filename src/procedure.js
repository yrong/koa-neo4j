/**
 * Created by keyvan on 11/27/16.
 */

import {parseNeo4jInts} from './preprocess';

class Hook {
    constructor(functions, neo4jConnection,
                procedureName, hookName, timeout) {
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

class Procedure {
    constructor({
        cypherQueryFile, cypher, timeout = 4000, check = (params, user) => true,
        preProcess = params => params, postProcess = result => result, postServe = result => result,
        name = 'procedure', route
    } = {}) {
        this.cypherQueryFile = cypherQueryFile;
        this.cypher = cypher;
        this.timeout = timeout;
        this.check = check;
        this.preProcess = preProcess;
        this.postProcess = postProcess;
        this.postServe = postServe;
        this.name = route || name;
    }

    invoke(neo4jConnection) {
        const checkHook = new Hook(this.check, neo4jConnection,
            this.name, 'check', this.timeout);
        const preProcessHook = new Hook(this.preProcess, neo4jConnection,
            this.name, 'preProcess', this.timeout);
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
        }, neo4jConnection, this.name, 'execution', this.timeout);

        const postProcessHook = new Hook(this.postProcess, neo4jConnection,
            this.name, 'postProcess', this.timeout);
        const postServeHook = new Hook(this.postServe, neo4jConnection,
            this.name, 'postServe', this.timeout * 3);

        return (params, ctx) => {
            const response = checkHook.execute(params, ctx)
                .then(checkPassed => {
                    if (!checkPassed)
                        throw new Error(`Check lifecycle hook of ${this.name} did not pass`);
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
                    executionHook.execute(params, this.cypherQueryFile),
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
    }
}

const createProcedure = (neo4jConnection, options) =>
    (new Procedure(options)).invoke(neo4jConnection);

export {Procedure, createProcedure};
