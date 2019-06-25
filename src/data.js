import {v1 as neo4j} from 'neo4j-driver';
import fs from 'fs';
import path from 'path';
import chai from 'chai';
import chalk from 'chalk';
import {parse} from 'parse-neo4j';
import {Procedure, createProcedure} from './procedure';
import log4js from 'log4js-wrapper-advanced';
const logger = log4js.getLogger();

class Neo4jConnection {
    constructor({boltUrl, user, password} = {}) {
        this.queries = {};

        this.driver = neo4j.driver(boltUrl, neo4j.auth.basic(user, password));
        const session = this.driver.session();
        this.initialized = session.run('RETURN "Neo4j instance successfully connected."')
            .then((result) => {
                logger.trace(chalk.green(parse(result)));
                session.close();
            })
            .catch(error => {
                logger.error(
                    chalk.red('Error connecting to the Neo4j instance, check connection options'));
                logger.error(error);
                throw error;
            });
    }

    addCypherQueryFile(cypherQueryFilePath) {
        this.queries[cypherQueryFilePath] = fs.readFileSync(cypherQueryFilePath, 'utf8');
    }

    async executeCypher(cypherQueryOrQueryFilePath, queryParams,
        pathIsQuery = false, ctx) {
        const _executeCypher = async (query, queryParams, ctx) => {
            let result, session, tx;
            try {
                session = ctx && ctx._neo4j_session || this.driver.session();
                logger.trace(
                    chalk.green(JSON.stringify({query: query, params: queryParams}, null, '\t'))
                );
                if (ctx && ctx.globalTransaction) {
                    tx = ctx._neo4j_tx || session.beginTransaction();
                    result = await tx.run(query, queryParams).then(parse);
                } else {
                    result = await session.run(query, queryParams).then(parse);
                    await session.close();
                }
            } catch (error) {
                await session.close();
                const errorDesc = error.fields ? JSON.stringify(error.fields[0]) : String(error);
                throw new Error(`error while executing Cypher:${errorDesc}`);
            }
            return result;
        };

        const _executeCyphers = async (query, queryParams, ctx) => {
            let session, tx;
            const results = [];
            try {
                session = ctx && ctx._neo4j_session || this.driver.session();
                tx = ctx && ctx._neo4j_tx || session.beginTransaction();
                logger.trace(
                    chalk.green(JSON.stringify({query: query, params: queryParams}, null, '\t'))
                );
                if (ctx && ctx.globalTransaction)
                    for (const entry of query)
                        results.push(await tx.run(entry, queryParams).then(parse));
                else {
                    for (const entry of query)
                        results.push(await tx.run(entry, queryParams).then(parse));
                    await tx.commit();
                    await session.close();
                }
            } catch (error) {
                await session.close();
                const errorDesc = error.fields ? JSON.stringify(error.fields[0]) : String(error);
                throw new Error(`error while executing Cypher:${errorDesc}`);
            }
            return results;
        };

        if (!pathIsQuery) {
            cypherQueryOrQueryFilePath = path.resolve(process.cwd(), cypherQueryOrQueryFilePath);
            if (!this.queries[cypherQueryOrQueryFilePath])
                this.addCypherQueryFile(cypherQueryOrQueryFilePath);
        }

        const query = pathIsQuery ? cypherQueryOrQueryFilePath :
            this.queries[cypherQueryOrQueryFilePath];

        let result = [];

        if (Array.isArray(query) && query.length)
            result = await _executeCyphers(query, queryParams, ctx);
        else
            result = await _executeCypher(query, queryParams, ctx);
        return result;
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
