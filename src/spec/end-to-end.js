/**
 * Created by keyvan on 8/31/16.
 */

import {given, when, then} from './bdd';
import {cypherQueryFilePathFor, httpGet} from './util';
import KoaNeo4jApp from './../index';

describe('A GET request', () => {
    const context = {};

    given('app is initialized on 4949', () => {
        context.app = new KoaNeo4jApp({
            neo4j: {
                // boltUrl: 'bolt://192.168.10.101',
                boltUrl: 'bolt://localhost',
                user: 'neo4j',
                password: 'k'
            }
        });
    });

    when('a GET API is defined on /param', () => context.app.defineAPI({
        method: 'GET',
        route: '/param',
        cypherQueryFile: cypherQueryFilePathFor('param')
    }));

    when('app is listening on 4949', (done) => {
        Promise.resolve(context.app.listen(4949, () => {
            console.log('App listening on port 4949.');
        }));
        context.app.neo4jInitialized.then(done);
    });

    then('passed parameter should be received from /param', (done) => {
        httpGet('/param?parameter=yoohoo', 4949).then(response => {
            response = JSON.parse(response);
            console.log(response);
            expect(response).toEqual([{parameter: 'yoohoo'}]);
            done();
        });
    });
});
