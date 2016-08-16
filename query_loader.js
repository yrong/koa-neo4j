/**
 * Created by keyvan on 8/16/16.
 */
console.log('loaaaaaaaaaaaaaaaaa');
import fs from 'fs';

let paths = fs.readdirSync('./cypher');
let query_dic = {};
paths.forEach((path) => {
    query_dic[path] = fs.readFileSync('./cypher/' + path, 'utf8');
});

export default query_dic;