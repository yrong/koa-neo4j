/* eslint max-len: ["error", 200] */
/**
 * Created by keyvan on 8/31/16.
 */

import {given, when, then} from './bdd';
import {cypherQueryFilePathFor, httpGet, httpPost} from './util';
import KoaNeo4jApp from './../index';

describe('End-to-end tests', () => {
    const context = {};

    // 1 //

    given('a KoaNeo4jApp with connection configuration', () => {
        context.app = new KoaNeo4jApp({
            neo4j: {
                boltUrl: 'bolt://localhost',
                user: 'neo4j',
                password: 'k'
            },
            authentication: {
                userCypherQueryFile: './cypher/tests/user.cyp',
                rolesCypherQueryFile: './cypher/tests/roles.cyp',
                route: '/auth',
                secret: 'secret'
            }
        });
    });

    when('app is initialized on 4949', (done) => {
        Promise.resolve(context.app.listen(4949, () => {
            console.log('App listening on port 4949.');
        }));
        context.app.neo4jInitialized.then(done)
            .catch((error) => setTimeout(() => { throw error; }));
    });

    // 2.1 //

    describe('a simple GET request with a `parameter` in cypher side', () => {
        when('a GET API is defined on /param', () => context.app.defineAPI({
            method: 'GET',
            route: '/param',
            cypherQueryFile: cypherQueryFilePathFor('param')
        }));

        then('passed parameter should be received from /param', (done) => {
            httpGet('/param?parameter=yoohoo', 4949)
                .then(response => {
                    response = JSON.parse(response);
                    console.log(response);
                    expect(response).toEqual([{parameter: 'yoohoo'}]);
                    done();
                });
        });
    });

    // 2.2 //

    describe('authentication is configured', () => {
        // when('authentication is configured', () =>
        //     context.app.configureAuthentication({
        //         userCypherQueryFile: './cypher/user.cyp',
        //         rolesCypherQueryFile: './cypher/roles.cyp',
        //         route: '/auth',
        //         secret: 'secret'
        //     }));

        then('an authentication token should be served for valid username and password on /auth', (done) => {
            httpPost('/auth?username=admin&password=test', 4949).then((response) => {
                response = JSON.parse(response);
                console.log(response);
                done();
            });
        });
    });
});
