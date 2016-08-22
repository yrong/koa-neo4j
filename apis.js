/**
 * Created by keyvan on 8/16/16.
 */
import API from './data'

let apis = [];

apis.push(new API('GET', '/doctors', 'doctor_result.cyp'));

apis.push(new API('POST', '/doctors', 'doctor_result.cyp', ['admin'], () => console.log('/doctors POST served.')));

apis.push(new API('GET', '/doctor/:id', 'doctor_view.cyp'));

export default apis;
