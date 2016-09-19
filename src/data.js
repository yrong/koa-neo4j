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
    constructor(func, hookName) {
        this.name = hookName;
        if (getArgs(func).slice(-1)[0] === 'resolve')
            this.constructAsyncWithTimeout(func);
        else if (getArgs(func).slice(-1)[0] === 'reject')
            this.constructAsyncWithReject(func);
        else
            this.constructSync(func);
    }

    constructAsyncWithTimeout(func) {
        this.execute = (...args) => Promise.race([
            new Promise(resolve => {
                args.push(resolve);
                func.apply(this.context, args);
            }),
            new Promise(resolve => setTimeout(resolve, 4000))
                .then(() => 'no response after 4 seconds')
        ])
            .then(result => {
                if (result === 'no response after 4 seconds')
                    throw new Error(`${this.name} lifecycle timed out, ${result}`);
                return result;
            });
    }

    constructAsyncWithReject(func) {
        this.execute = (...args) => new Promise((resolve, reject) => {
            args.push(resolve);
            args.push(reject);
            func.apply(this.context, args);
        });
    }

    constructSync(func) {
        this.execute = (...args) => Promise.resolve(func.apply(this.context, args));
    }
}

class Procedure {
    constructor(neo4jConnection, {cypherQueryFile, check = (params, user) => true,
        preProcess = params => params, postProcess = result => result} = {}) {
        this.neo4jConnection = neo4jConnection;

        const checkHook = new Hook(check, 'check');
        const preProcessHooh = new Hook(preProcess, 'preProcess');
        const postProcessHook = new Hook(postProcess, 'postProcess');

        this.response = (params, user) => {
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
    }
}

class API extends Procedure {
    constructor(neo4jConnection, {method, route, allowedRoles = [],
        cypherQueryFile, check, preProcess, postProcess} = {}) {
        super(neo4jConnection, {cypherQueryFile, check, preProcess, postProcess});

        this.method = method;
        this.route = route;
        this.allowedRoles = allowedRoles;
        this.requiresJwtAuthentication = allowedRoles &&
            Array.isArray(allowedRoles) && allowedRoles.length > 0;
    }
}

export {Neo4jConnection, Procedure, API};
