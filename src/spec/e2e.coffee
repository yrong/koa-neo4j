bdd = require './../../bdd.js'
KoaNeo4jApp = require './../../index.js'
{httpGet, httpPost} = require './../../util.js'


describe 'End-to-end tests', ->

    bdd.givenOnce 'a KoaNeo4jApp with connection configuration', ->
        @app = new KoaNeo4jApp
            neo4j:
                boltUrl: 'bolt://localhost',
                user: 'neo4j',
                password: 'k'

    bdd.whenOnce 'app is initialized on 4949', (done) ->
        app = @app
        Promise.all [
            new Promise (resolve) ->
                app.listen 4949, ->
                    resolve()
                    console.log 'App listening on port 4949.'
            ,
            app.neo4jInitialized
            ]
        .then done
        .catch (error) -> setTimeout -> throw error

    describe 'a simple GET request with a `parameter` in cypher side', ->

        bdd.givenOnce 'a GET API is defined on /param', -> @app.defineAPI
            method: 'GET',
            route: '/param',
            cypherQueryFile: './cypher/tests/it.cyp'

        bdd.then 'passed parameter should be received from /param', (done) ->
            httpGet '/param?it=resolves!', 4949
                .then (response) ->
                    response = JSON.parse response
                    console.log response
                    expect(response).toEqual [{ it: 'resolves!' }]
                    done()

    describe 'authentication', ->

        bdd.givenOnce 'authentication is configured', -> @app.configureAuthentication
            userCypherQueryFile: './cypher/tests/user.cyp',
            rolesCypherQueryFile: './cypher/tests/roles.cyp',
            route: '/auth',
            secret: 'secret'

        bdd.then 'a refresh token should be served for valid username and password on /auth', (done) ->
            httpPost '/auth', 4949, { username:'admin', password:'test' }
                .then (response) ->
                    response = JSON.parse response;
                    console.log response
                    token = response.token
                    expect(token).toBeDefined
                    bdd.appendToContext 'token', token
                    done()
                .catch (err) -> console.log err

        describe 'restricted route with incorrect rights', ->

            bdd.givenOnce 'a POST API is defined on /restricted_unless_user with `user` role', ->
                @app.defineAPI
                    method: 'POST'
                    route: '/restricted_unless_user'
                    allowedRoles: ['user']
                    cypherQueryFile: './cypher/tests/it.cyp'

            bdd.then '`admin` should **not** be able to access /restricted_unless_user without `Authorization` header', (done) ->
                console.log @token
                httpPost '/restricted_unless_user', 4949, { it: 'works!' }
                    .then (response) ->
                        response = JSON.parse response;
                        console.log response
                        expect(response).toEqual({ error: 'Error: Authorization required' })
                        done()
                    .catch (error) -> console.log error

            bdd.then '`admin` should **not** be able to access /restricted_unless_user even with the refresh token', (done) ->
                console.log @token
                httpPost '/restricted_unless_user', 4949, { it: 'works!' }, { Authorization: @token }
                    .then (response) ->
                        response = JSON.parse response;
                        console.log response
                        expect(response).toEqual({ error: 'Error: You don\'t have permission for this' })
                        done()
                    .catch (error) -> console.log error

        describe 'restricted route with correct rights', ->

            bdd.givenOnce 'a POST API is defined on /restricted with `admin` role', ->
                @app.defineAPI
                    method: 'POST'
                    route: '/restricted'
                    allowedRoles: ['admin']
                    cypherQueryFile: './cypher/tests/it.cyp'

            bdd.then '`admin` should not be able to access /restricted with the refresh token', (done) ->
                console.log @token
                httpPost '/restricted', 4949, { it: 'works!' }, { Authorization: @token }
                    .then (response) ->
                        response = JSON.parse response;
                        console.log response
                        expect(response).toEqual([{ it: 'works!' }])
                        done()
                    .catch (error) -> console.log error
