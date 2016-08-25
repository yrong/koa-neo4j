/**
 * Created by keyvan on 8/16/16.
 */
import seraph from 'seraph';
import fs from 'file-system';
import chalk from 'chalk';

const queryDict = {};
let db;

const addCypherQueryFile = (cypherQueryFilePath) => {
    queryDict[cypherQueryFilePath] = fs.readFileSync(cypherQueryFilePath, 'utf8');
};

const initializeDatabase = (server, endpoint, user, password) => {
    try {
        db = seraph({
            server: server,
            endpoint: endpoint,
            user: user,
            pass: password
        });
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
    db.query(query, queryParams, (err, result) => {
        if (err)
            reject(err);
        else
            resolve(result);
    });
});

class API {
    constructor(method, route, cypherQueryFilePath, allowedRoles = [],
                postProcess = (result) => result) {
        this.method = method;
        this.route = route;
        this.allowedRoles = allowedRoles;
        this.requiresJwtAuthentication = allowedRoles &&
            Array.isArray(allowedRoles) && allowedRoles.length > 0;

        this.response = (params) => executeCypher(cypherQueryFilePath, params).then(postProcess);
    }
}

export {executeCypher, initializeDatabase};
export default API;
