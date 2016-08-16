/**
 * Created by keyvan on 8/16/16.
 */
import executeCypher from '../data'
let sege = (s) => new Promise((resolve, reject) => {console.log('gggggggggg ' + s); resolve('riidiiiiiiiii')});

let doctors = {
    body: async (params) => {
        params.skip = parseInt(params.skip);
        params.limit = parseInt(params.limit);
        return await executeCypher('doctor_result.cyp', params);
    },
    // body: async (request) => await sege('sooote'),
    method: 'GET',
    route: '/doctors'
};

export default doctors;