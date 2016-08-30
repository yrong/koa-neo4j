/**
 * Created by keyvan on 8/16/16.
 */
import {v1 as neo4j} from 'neo4j-driver';
import fs from 'file-system';
import chalk from 'chalk';
import parseNeo4jResponse from './parser';

const queryDict = {};
let driver;

const addCypherQueryFile = (cypherQueryFilePath) => {
    queryDict[cypherQueryFilePath] = fs.readFileSync(cypherQueryFilePath, 'utf8');
};

const initializeDatabase = ({boltUrl, user, password} = {}) => {
    driver = neo4j.driver(boltUrl, neo4j.auth.basic(user, password));
    const session = driver.session();
    return session.run('RETURN "Neo4j instance successfully connected."')
        .then((result) => {
            console.log(chalk.green(parseNeo4jResponse(result)));
            session.close();
        })
        .catch(error => {
            console.error(
                chalk.red('Error connecting to the Neo4j instance, check connection options'));
            throw error.fields ? new Error(String(error.fields[0])) : error;
        });
};

const executeCypher = (cypherQueryFilePath, queryParams) => new Promise((resolve, reject) => {
    if (!queryDict[cypherQueryFilePath])
        addCypherQueryFile(cypherQueryFilePath);

    const query = queryDict[cypherQueryFilePath];
    const session = driver.session();

    session.run(query, queryParams)
        .then(result => {
            resolve(result);
            session.close();
        })
        .catch(reject);
})
    .then(parseNeo4jResponse);

class API {
    constructor({method, route, cypherQueryFile, allowedRoles = [],
        preProcess = params => params, postProcess = result => result} = {}) {
        this.method = method;
        this.route = route;
        this.allowedRoles = allowedRoles;
        this.requiresJwtAuthentication = allowedRoles &&
            Array.isArray(allowedRoles) && allowedRoles.length > 0;

        this.response = params => Promise.resolve(preProcess.apply(null, [params]))
            .then(params => executeCypher(cypherQueryFile, params))
            .then(postProcess);
    }
}

const neo4jInt = neo4j.int;

const parseId = params => {
    params.id = neo4jInt(params.id);
    return params;
};

export {executeCypher, initializeDatabase, parseId, neo4jInt};
export default API;
