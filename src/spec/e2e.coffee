{Given, When, Then} = require './../../bdd.js'
{httpGet, httpPost} = require './../../util.js'
KoaNeo4jApp = require './../../index.js'


describe 'End-to-end tests', ->

    Given 'a KoaNeo4jApp with connection configuration', ->
        @app = new KoaNeo4jApp
            neo4j:
                boltUrl: 'bolt://localhost',
                user: 'neo4j',
                password: 'k'

    When 'app is initialized on 4949', (done) ->
        Promise.resolve @app.listen 4949, ->
            console.log 'App listening on port 4949.'
        @app.neo4jInitialized.then done
            .catch (error) -> setTimeout -> throw error

    describe 'a simple GET request with a `parameter` in cypher side', ->

        Given 'a GET API is defined on /param', -> @app.defineAPI
            method: 'GET',
            route: '/param',
            cypherQueryFile: './cypher/tests/param.cyp'

        Then 'passed parameter should be received from /param', (done) ->
            httpGet '/param?parameter=yoohoo', 4949
                .then (response) ->
                    response = JSON.parse response
                    console.log response
                    expect response
                      .toEqual [{parameter: 'yoohoo'}]
                    done()

    describe 'authentication', ->

        Given 'authentication is configured', -> @app.configureAuthentication
            userCypherQueryFile: './cypher/tests/user.cyp',
            rolesCypherQueryFile: './cypher/tests/roles.cyp',
            route: '/auth',
            secret: 'secret'

        Then 'an authentication token should be served for valid username and password on /auth', (done) ->
            httpPost '/auth', 4949, { username:'admin', password:'test' }
                .then (response) ->
                    response = JSON.parse [response];
                    console.log response
                    expect response.token
                      .toBeDefined
                    done()
                .catch (err) -> console.log err
