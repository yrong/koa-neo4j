/**
 * Created by keyvan on 8/16/16.
 */
import seraph from 'seraph';
import fs from 'file-system';

let paths = fs.readdirSync('./cypher');
let query_dict = {};
for (let path of paths) {
    query_dict[path] = fs.readFileSync('./cypher/' + path, 'utf8');
}

var db = seraph({
    server: "http://192.168.10.101:7474",
    endpoint: "/db/data",
    user: "neo4j",
    pass: "k"
});

let executeCypher = (query_file_name, query_params) => new Promise((resolve, reject) => {
    let query = query_dict[query_file_name];
    db.query(query, query_params, (err, result) => {
        if (err)
            reject(err);
        else
            resolve(result);
    });
});

class API {
    constructor(method, route, cypher_query_file_name, allowed_roles=[], then=() => {}) {
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

console.log('Database successfully connected.');

export {executeCypher};
export default API;
