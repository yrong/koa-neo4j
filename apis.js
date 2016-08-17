/**
 * Created by keyvan on 8/16/16.
 */
import executeCypher from './data'
class API {
    constructor(method, route, cypher_query_file_name, then=() => {}) {
        this.method = method;
        this.route = route;
        this.response = (params) => executeCypher(cypher_query_file_name, params).then((response) => {
            then();
            return response;
        });
    }
}

let apis = [];

apis.push(new API('GET', '/doctors', 'doctor_result.cyp', () => console.log('/doctors served.')));

apis.push(new API('GET', '/doctor/:id', 'doctor_view.cyp'));

export default apis;
