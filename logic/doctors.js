/**
 * Created by keyvan on 8/16/16.
 */
import executeCypher from '../data'
let sege = (s) => new Promise((resolve, reject) => {console.log('gggggggggg ' + s); resolve('riidiiiiiiiii')});

let doctors = {
    body: async (request) => await executeCypher('doctor_result.cyp', {skip:10, limit:20}),
    // body: async (request) => await sege('sooote'),
    method: 'GET',
    route: '/doctors'
};

export default doctors;