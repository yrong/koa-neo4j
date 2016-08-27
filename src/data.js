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
    try {
        driver = neo4j.driver(boltUrl, neo4j.auth.basic(user, password));
        console.log(chalk.green('Database successfully connected.'));
    } catch (error) {
        console.error(chalk.red('Invalid database parameters, database is not connected'));
        throw error;
    }
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
                postProcess = result => result} = {}) {
        this.method = method;
        this.route = route;
        this.allowedRoles = allowedRoles;
        this.requiresJwtAuthentication = allowedRoles &&
            Array.isArray(allowedRoles) && allowedRoles.length > 0;

        this.response = params => executeCypher(cypherQueryFile, params).then(postProcess);
    }
}

export {executeCypher, initializeDatabase};
export default API;
