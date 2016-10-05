bdd = require './../../bdd'
KoaNeo4jApp = require './../../index'
{httpGet, httpPost} = require './../../util'


describe 'End-to-end tests', ->

    bdd.givenOnce 'a KoaNeo4jApp with connection configuration', ->
        @app = new KoaNeo4jApp
            neo4j:
                boltUrl: 'bolt://localhost',
                user: 'neo4j',
                password: 'neo4j'

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
        .catch (error) -> setTimeout -> throw error, 0

    describe 'a simple GET request with a `parameter` in cypher side', ->

        bdd.givenOnce 'a GET API is defined on /param', -> @app.defineAPI
            method: 'GET',
            route: '/param',
            cypherQueryFile: './cypher/tests/it.cyp'

        bdd.then 'parameter passed in the query string should be received from /param', (done) ->
            httpGet '/param?it=resolves!', 4949
                .then (response) ->
                    console.log response
                    expect(response).toEqual [{ it: 'resolves!' }]
                    done()

    describe 'a simple GET request with a `parameter` in cypher side', ->

        bdd.givenOnce 'a GET API is defined on /param/:it', -> @app.defineAPI
            method: 'GET',
            route: '/param/:it',
            cypherQueryFile: './cypher/tests/it.cyp'

        bdd.then 'parameter passed in the route should be received from /param', (done) ->
            httpGet '/param/resolves!', 4949
                .then (response) ->
                    console.log response
                    expect(response).toEqual [{ it: 'resolves!' }]
                    done()

    describe 'sync hooks', ->

        bdd.givenOnce 'a GET API with postProcess hook', -> @app.defineAPI
            method: 'GET',
            route: '/sync-hook/:it',
            cypherQueryFile: './cypher/tests/it.cyp',
            postProcess: (result, params) ->
                result[0].really = params.it
                result

        bdd.then 'postProcess should change the result', (done) ->
            httpGet '/sync-hook/hooks!', 4949
            .then (response) ->
                console.log response
                expect(response).toEqual [{ it: 'hooks!', really: 'hooks!' }]
                done()

    describe 'async timeout hook success', ->

        bdd.givenOnce 'a GET API with async postProcess hook responds within 4 seconds', -> @app.defineAPI
            method: 'GET',
            route: '/async-timeout-hook-success/:it',
            cypherQueryFile: './cypher/tests/it.cyp',
            postProcess: (result, params) ->
                new Promise (resolve) ->
                    setTimeout resolve, 2000
                .then () ->
                    result[0].really = params.it
                    result

        bdd.then 'postProcess should change the result', (done) ->
            httpGet '/async-timeout-hook-success/hooks!', 4949
            .then (response) ->
                console.log response
                expect(response).toEqual [{ it: 'hooks!', really: 'hooks!' }]
                done()

    describe 'async timeout hook failure', ->

        bdd.givenOnce 'a GET API with async postProcess hook **no response** within 4 seconds', -> @app.defineAPI
            method: 'GET',
            route: '/async-timeout-hook-failure/:it',
            cypherQueryFile: './cypher/tests/it.cyp',
            postProcess: (result, params) ->
                new Promise (resolve) ->
                    setTimeout resolve, 4500
                .then () ->
                    result[0].really = params.it
                    result

        bdd.then 'postProcess should fail because it takes longer than 4 seconds', (done) ->
            httpGet '/async-timeout-hook-failure/hooks!', 4949
            .then (response) ->
                console.log response
                expect response
                    .toEqual 'ConflictError: postProcess lifecycle of /async-timeout-hook-failure/:it timed out, no response after 4 seconds'
                done()

    describe 'async hook with reject failure', ->

        bdd.givenOnce 'a GET API rejects request in async postProcess hook', -> @app.defineAPI
            method: 'GET',
            route: '/async-timeout-hook-reject/:it',
            cypherQueryFile: './cypher/tests/it.cyp',
            postProcess: (result, params) ->
                Promise.reject 'operation not successful'

        bdd.then 'postProcess should fail because it has been rejected', (done) ->
            httpGet '/async-timeout-hook-reject/hooks!', 4949
            .then (response) ->
                console.log response
                expect response
                    .toEqual 'ConflictError: operation not successful'
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
                    console.log response
                    token = response.token
                    expect(token).toBeDefined()
                    bdd.context.token = token
                    done()
                .catch (err) -> console.log err

        describe 'restricted route with incorrect rights', ->

            bdd.givenOnce 'a POST API is defined on /restricted_unless_user with `user` role', ->
                @app.defineAPI
                    method: 'POST'
                    route: '/restricted_unless_user'
                    allowedRoles: ['user']
                    cypherQueryFile: './cypher/tests/it.cyp'

            bdd.then '`admin` should **not** be able to access /restricted_unless_user with her refresh token', (done) ->
                console.log @token
                httpPost '/restricted_unless_user', 4949, { it: 'works!' }
                    .then (response) ->
                        console.log response
                        expect response
                            .toEqual 'UnauthorizedError: authorization required'
                        done()
                    .catch (error) -> console.log error

            bdd.then '`admin` should **not** be able to access /restricted_unless_user even with the refresh token', (done) ->
                console.log @token
                httpPost '/restricted_unless_user', 4949, { it: 'works!' }, { Authorization: @token }
                    .then (response) ->
                        console.log response
                        expect response
                            .toEqual 'ForbiddenError: user does not have permission for this resource'
                        done()
                    .catch (error) -> console.log error

        describe 'restricted route with correct rights', ->

            bdd.givenOnce 'a POST API is defined on /restricted with `admin` role', ->
                @app.defineAPI
                    method: 'POST'
                    route: '/restricted'
                    allowedRoles: ['admin']
                    cypherQueryFile: './cypher/tests/it.cyp'

            bdd.then '`admin` should be able to access /restricted with the refresh token', (done) ->
                console.log @token
                httpPost '/restricted', 4949, { it: 'works!' }, { Authorization: @token }
                    .then (response) ->
                        console.log response
                        expect(response).toEqual([{ it: 'works!' }])
                        done()
                    .catch (error) -> console.log error
