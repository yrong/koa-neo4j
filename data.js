/**
 * Created by keyvan on 8/16/16.
 */
import seraph from 'seraph';
import query_dict from './query_loader'

var db = seraph({ server: "http://localhost:7474",
    endpoint: "/db/data",
    user: "neo4j",
    pass: "k" });

let executeCypher = (query_file_name, query_params) => new Promise((resolve, reject) => {
    let query = query_dict[query_file_name];
    db.query(query, query_params, (err, result) => {
        if (err)
            reject(err);
        else
            resolve(result);
    });
});

export default executeCypher;