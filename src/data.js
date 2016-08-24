/**
 * Created by keyvan on 8/16/16.
 */
import seraph from 'seraph';
import fs from 'file-system';
import chalk from 'chalk';


const query_dict = {};
let db;

const initializeDatabase = (cypherDirectoryPath, server, endpoint, user, password) => {
  try {
    const paths = fs.readdirSync(cypherDirectoryPath);
    for (const path of paths) {
      query_dict[path] = fs.readFileSync(cypherDirectoryPath + path, 'utf8');
    }

    db = seraph({
      server: server,
      endpoint: endpoint,
      user: user,
      pass: password
    });

    console.log(chalk.green('Database successfully connected.'));
  }
    catch (error) {
      console.error(chalk.red('Invalid database parameters, database is not connected'));
      throw error;
    }
};


const executeCypher = (query_file_name, query_params) => new Promise((resolve, reject) => {
  const query = query_dict[query_file_name];
  db.query(query, query_params, (err, result) => {
    if (err)
      reject(err);
    else
            resolve(result);
  });
});

class API {
  constructor(method, route, cypher_query_file_name, allowed_roles = [], then = () => {}) {
    this.method = method;
    this.route = route;
    this.allowed_roles = allowed_roles;
    this.requires_jwt_authentication = allowed_roles && Array.isArray(allowed_roles) && allowed_roles.length > 0;

    this.response = (params) => executeCypher(cypher_query_file_name, params).then((response) => {
      then();
      return response;
    });
  }
}

export {executeCypher, initializeDatabase};
export default API;
