/**
 * Created by keyvan on 8/16/16.
 */

import {v1 as neo4j} from 'neo4j-driver';
import fs from 'file-system';
import chalk from 'chalk';
import parser from 'parse-neo4j';
import {parseNeo4jInts} from './preprocess';
import {pipe} from './util';

class Neo4jConnection {
    constructor({boltUrl, user, password} = {}) {
        this.queryDict = {};

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
        this.queryDict[cypherQueryFilePath] = fs.readFileSync(cypherQueryFilePath, 'utf8');
    }

    executeCypher(cypherQueryFilePath, queryParams) {
        return new Promise((resolve, reject) => {
            if (!this.queryDict[cypherQueryFilePath])
                this.addCypherQueryFile(cypherQueryFilePath);

            const query = this.queryDict[cypherQueryFilePath];
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

class API {
    constructor(neo4jConnection, {method, route, cypherQueryFile,
        allowedRoles = [], parseIdSkipLimit = true, check = (params, user) => true,
        preProcess = params => params, postProcess = result => result} = {}) {
        this.neo4jConnection = neo4jConnection;
        this.method = method;
        this.route = route;
        this.allowedRoles = allowedRoles;
        this.requiresJwtAuthentication = allowedRoles &&
            Array.isArray(allowedRoles) && allowedRoles.length > 0;

        this.response = (params, user) => {
            return Promise.resolve(check(params, user))
                .then(checkPassed => {
                    if (!checkPassed)
                        throw new Error('Check lifecycle hook not passed');
                })
                .then(() => {
                    let preProcessToUse = preProcess;
                    if (parseIdSkipLimit) {
                        const keys = [];
                        for (const key of ['id', 'skip', 'limit'])
                            if (params[key])
                                keys.push(key);
                        if (keys.length > 0)
                            preProcessToUse = pipe(parseNeo4jInts(...keys), preProcess);
                    }
                    return preProcessToUse.apply(this, [params]);
                })
                .then(params => neo4jConnection.executeCypher(cypherQueryFile, params))
                .then(postProcess);
        };
    }
}

export {API, Neo4jConnection};
