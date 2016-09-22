/**
 * Created by keyvan on 8/16/16.
 */

import {v1 as neo4j} from 'neo4j-driver';
import fs from 'file-system';
import chalk from 'chalk';
import parser from 'parse-neo4j';
import {parseNeo4jInts} from './preprocess';
import {pipe, getArgs} from './util';

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

    executeCypher(cypherQueryFilePath, queryParams) {
        return new Promise((resolve, reject) => {
            if (!this.queries[cypherQueryFilePath])
                this.addCypherQueryFile(cypherQueryFilePath);

            const query = this.queries[cypherQueryFilePath];
            const session = this.driver.session();

            session.run(query, queryParams)
                .then(result => {
                    resolve(result);
                    session.close();
                })
                .catch(reject);
        })
            .then(parser.parse);
    }
}

class Hook {
    constructor(func, route, hookName) {
        this.name = hookName;
        this.route = route;
        const lastTwoArgs = getArgs(func).slice(-2);
        if (lastTwoArgs[0] === 'resolve' || lastTwoArgs[1] === 'resolve')
            this.constructAsync(func, lastTwoArgs[1] === 'reject');
        else
            this.constructSync(func);
    }

    constructAsync(func, rejectPresent) {
        this.execute = (...args) => Promise.race([
            new Promise((resolve, reject) => {
                args.push(resolve);
                if (rejectPresent)
                    args.push(reject);
                func.apply(this.context, args);
            }),
            new Promise(resolve => setTimeout(resolve, 4000))
                .then(() => 'no response after 4 seconds')
        ])
            .then(result => {
                if (result === 'no response after 4 seconds')
                    throw new Error(`${this.name} lifecycle of ${this.route} timed out, ${result}`);
                return result;
            });
    }

    constructSync(func) {
        this.execute = (...args) => Promise.resolve(func.apply(this.context, args));
    }
}


const createProcedure = (neo4jConnection, {cypherQueryFile, check = (params, user) => true,
    preProcess = params => params, postProcess = result => result,
    name = 'createProcedure'} = {}) => {
    const checkHook = new Hook(check, name, 'check');
    const preProcessHooh = new Hook(preProcess, name, 'preProcess');
    const postProcessHook = new Hook(postProcess, name, 'postProcess');

    return (params, user) => {
        return checkHook.execute(params, user)
            .then(checkPassed => {
                if (!checkPassed)
                    throw new Error('Check lifecycle hook did not pass');
                return params;
            })
            .then(pipe(parseNeo4jInts('id', 'skip', 'limit'), preProcessHooh.execute))
            .then(params => Promise.all([
                neo4jConnection.executeCypher(cypherQueryFile, params),
                Promise.resolve(params)
            ]))
            .then(([result, params]) => postProcessHook.execute(result, params));
    };
};

class API {
    constructor(neo4jConnection, {method, route, allowedRoles = [], procedure,
        cypherQueryFile, check, preProcess, postProcess} = {}) {
        if (typeof procedure === 'function')
            this.response = procedure;
        else
            this.response = createProcedure(neo4jConnection,
                {cypherQueryFile, check, preProcess, postProcess, name: route});

        this.method = method;
        this.route = route;
        this.allowedRoles = allowedRoles;
        this.requiresJwtAuthentication = allowedRoles &&
            Array.isArray(allowedRoles) && allowedRoles.length > 0;
    }
}

export {Neo4jConnection, createProcedure, API};
