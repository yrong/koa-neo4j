/**
 * Created by keyvan on 8/16/16.
 */
import executeCypher from './data'
class API {
    constructor(method, route, cypher_query_file_name) {
        this.method = method;
        this.route = route;
        this.body = (params) => executeCypher(cypher_query_file_name, params);
    }
}

let doctors = new API('GET', '/doctors', 'doctor_result.cyp');

let doctor = new API('GET', '/doctor/:id', 'doctor_view.cyp');

export {doctors, doctor};
