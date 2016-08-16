/**
 * Created by keyvan on 8/16/16.
 */
import seraph from 'seraph';
import query_dict from './query_loader'

console.log('sadfsddfdsf');

var db = seraph({ server: "http://localhost:7474",
    endpoint: "/db/data",
    user: "neo4j",
    pass: "k" });

console.log('eeeeeeeeeeeee');

let executeCypher = (query_file_name, query_params) => new Promise((resolve, reject) => {
    let query = query_dict[query_file_name];
    console.log('seeeeeeeeeeee' + JSON.stringify(query_params));
    db.query(query, query_params, (err, result) => {
        if (err) {
            console.log('ridiiiiiiiiiiiiiii');
            console.log(JSON.stringify(err));
            reject(err);
        }
        else {
            console.log('horaaaaaaaaaaaaaa');
            resolve(result);
        }
    });
});

export default executeCypher;