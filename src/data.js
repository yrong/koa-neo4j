/**
 * Created by keyvan on 8/16/16.
 */

import {v1 as neo4j} from 'neo4j-driver';
import fs from 'file-system';
import chai from 'chai';
import chalk from 'chalk';
import {parse} from 'parse-neo4j';
import {Procedure, createProcedure} from './procedure';

class Neo4jConnection {
    constructor({boltUrl, user, password} = {}) {
        this.queries = {};

        this.driver = neo4j.driver(boltUrl, neo4j.auth.basic(user, password));
        const session = this.driver.session();
        this.initialized = session.run('RETURN "Neo4j instance successfully connected."')
            .then((result) => {
                console.log(chalk.green(parse(result)));
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
            .then(parse);
    }
}

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
        chai.assert.isArray(this.allowedRoles);
        this.allowedRoles = this.allowedRoles.map(role => role.toLowerCase());
        this.requiresJwtAuthentication = this.allowedRoles.length > 0;
    }
}

export {Neo4jConnection, Procedure, API};
