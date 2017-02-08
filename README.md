[![npm version](https://badge.fury.io/js/koa-neo4j.svg)](https://www.npmjs.com/package/koa-neo4j)
[![Build Status](https://travis-ci.org/assister-ai/koa-neo4j.svg?branch=master)](https://travis-ci.org/assister-ai/koa-neo4j)
 
# koa-neo4j

`koa-neo4j` is a framework for creating web servers that embody application's logic powered by
a [Neo4j Graph Database](https://neo4j.com/) backend.

In a Neo4j enabled application, conducting queries directly from client side might not be the best choice:

- Database is exposed to the client, unless some explicit security mechanism is in place; one can *see* the
innards of the database by `View page source`
- There is no **one server to rule them all**, queries are `string`s, scattered around different
clients (web, mobile, etc.)
- Third-party developers might not be familiar with Cypher

`koa-neo4j` addresses all of the above issues:

- Stands as a middle layer between clients and the database 
- Gives structure to your server's logic in form of a file-based project; finally a home for Cypher!
All of the clients can then talk to an instance of this server
- Converts Cypher files to REST routes, a cross-platform web standard that developers are familiar with, it does so
on top of the widely-adapted [**koa**](http://koajs.com/) server, ripe for further customization
 
In addition, it comes with *goodies*:

- Hassle-free [authentication](#authentication) and non-opinionated user management, you describe (in Cypher) how your
users and roles are stored, the framework provides authentication and role-based access management
- [Lifecycle hooks](#lifecycle-hooks), enabling one to tweak incoming and outgoing data based on one's needs, allowing
utilisation of the full power of `nodejs` and `javascript` ecosystem in the process
- [Procedures](#procedures) as a means for creating reusable blocks of backend code 

## Install

```bash
npm install koa-neo4j --save
```

## Usage

You can find a comprehensive example at [koa-neo4j-starter-kit](https://github.com/assister-ai/koa-neo4j-starter-kit)
```javascript
var KoaNeo4jApp = require('koa-neo4j');

var app = new KoaNeo4jApp({
    // Neo4j config objects, mandatory
    neo4j: {
        boltUrl: 'bolt://localhost',
        user: 'neo4j',
        password: '<YOUR_NEO4J_PASSWORD>'
    },

    // Authentication config object, optional
    // authentication: {...} // explained below

    // APIs config object, optional (same effect could be achieved later by app.defineAPI)
    apis: [
        {
            method: 'GET',
            route: '/authors',
            cypherQueryFile: './cypher/authors.cyp'
        },
        {
            method: 'GET',
            route: '/articles/:skip/:limit',
            cypherQueryFile: './cypher/articles.cyp'
        }
    ]
});

app.listen(3000, function () {
    console.log('App listening on port 3000.');
});

```

### Defining an API

An API is defined by at least three keys:

`method`, specifies the request type (GET|POST|PUT|DEL)

`route`, the path to this API (e.g. the first API defined in `apis` above becomes http://localhost:3000/authors)

`cypherQueryFile`, path to the corresponding `.cyp` file

Optionally you can specify roles whom can access this route with `allowedRoles` and
also [lifecycle hooks](#lifecycle-hooks).

As an example:

```javascript
app.defineAPI({
    // allowedRoles: ['admin', 'author']    // roles are case insensitive
    method: 'POST',
    route: '/create-article',
    cypherQueryFile: './cypher/create_article.cyp'
})
```

And then in `./cypher/create_article.cyp`:

```cypher
CREATE (a:Article {
    title: $title,
    author: $author,
    created_at: timestapm()
})
RETURN a
```

Cypher queries, accept parameters via the `$` syntax.

These parameters are matched by query parameters `/articles?title=Hello&author=World` or route parameters
(e.g. if route was defined as `/create-article/:author/:title` then `/create-article/World/Hello`)

In addition, any data accompanied by the request will also be passed to the Cypher query, retaining the variable names,
so for example:

```bash
curl --data "title=The%20Capital%20T%20Truth&author=David%20Foster%20Wallace" localhost:3000/create-article
```

becomes a POST request, {"title": "The Capital T Truth", "author": "David Foster Wallace"} will be
passed to `./cypher/create_article.cyp` which refers to these parameters as `$title` and `$author`

In case of encountering same variable names, priority is applied: *`request data` > `route params` > `query params`*

### Authentication

Authentication is facilitated through [JSON web token](https://github.com/auth0/node-jsonwebtoken), all it takes to
have authentication in your app is to supplement `Authentication config object` either with `authentication` key
when initiating the app instance or in `configureAuthentication` method:
```javascript
app.configureAuthentication({
    // route, mandatory.
    route: '/auth',

    // secret, mandatory. This is the key that JWT uses to encode objects, best practice is to use a
    // long and random password-like string
    secret: 'secret',

    // userCypherQueryFile, mandatory. This cypher query is invoked with `$username` and is expected to return
    // a single object at least containing two keys: `{id: <user_id>, password: <user_password_or_hash>}`
    // the returned `id` would later be passed to get roles of this user
    userCypherQueryFile: './cypher/user.cyp',

    // rolesCypherQueryFile, optional. Invoked with `$id` returned from userCypherQueryFile, this query is
    // expected to return a list of strings describing roles of this user, you can do all sorts of traversals
    // that cypher allows to generate this list. Defaults to labels of the node matching the id:
    // `MATCH (user) WHERE id(user) = $id RETURN {roles: labels(user)}`
    // rolesCypherQueryFile: './cypher/roles.cyp'
});
```

And your desired `$username` to `user` mapping in `userCypherQueryFile`:
```cypher
// Takes $username and returns a user object with at least 'id' and 'password'
MATCH (author:Author)-[:HAS]->(account:UserAccount)
WHERE account.user_name = $username
RETURN {id: id(author), password: account.password_hash}
```

When authentication is configured, you can access it by the route you specified:

![Invoking Authentication](https://github.com/assister-ai/koa-neo4j/raw/master/images/invoking_auth.png "Invoking Authentication")

Note that if you don't set `"remember": true`, the generated token expires in an hour.

Returned object contains a `token` which should be supplemented as `Authorization` header
in subsequent calls to routes that have `allowedRoles` protection.

In addition, a `user` object is returned that matches the object returned by `userCypherQueryFile` except
for the `password` key, which is deleted (so that security won't be compromised should
clients decide to save this object) and `roles` key, which is the object returned by `rolesCypherQueryFile`.

### Lifecycle hooks

A lifecycle hook is a single function or a group of functions invoked at a certain phase in request-to-response cycle.
It helps with shaping the data according to one's needs. Further, the framework comes with a number of build-in hook
functions, ready to be dropped in their corresponding lifecycle.

A hook function takes the form of a normal JavaScript function, with arguments consistent with the lifecycle in which
it'd be deployed. If an array of functions is submitted for a lifecycle, each function in the array is executed,
sequentially, and the returned object from the function would be passed as the first argument of the next function.

```javascript
app.defineAPI({
    preProcess: [
        function(params, ctx) {
            // do something with params and/or ctx
            return {modified: 'params'};
        },  //     ‾‾‾‾‾‾‾‾‾‾|‾‾‾‾‾‾‾‾‾
        //                   |
        //         ↓‾‾‾‾‾‾‾‾‾‾
        function(params, ctx) {
            params.again = 'modified';
            // params now is: {modified: 'params', again: 'modified'}
            return params
        },  //     ‾‾|‾‾‾
        //           |
        //           ↓
        function(params, ctx) {
            params.and = 'again';
            // params now is: {modified: 'params', again: 'modified', and: 'again'}
            return params
        },
        //      ... this can continue ...
    ]
});
```

**ProTip:** if returned value in a hook function is a `Promise` or an array containing any `Promise`s, first argument of
the next function would be the resolved value or an array with all it's elements resolved, respectively.

#### check lifecycle: (params[, ctx]) -> :boolean

#### preProcess lifecycle: (params[, ctx]) -> params

#### execution lifecycle

#### postProcess lifecycle: (result[, params, ctx]) -> result

#### postServe lifecycle: (result[, params, ctx]) -> result

### Procedures

Procedures share semantics with APIs, they are defined in the same way that an API is defined, except they don't accept
`route` and `allowedRoles`. You can create idiomatic and reusable blocks of backend code using procedures and build-in
lifecycle methods:

```javascript
var parseIds = require('koa-neo4j/preprocess').parseIds;
var parseDates = require('koa-neo4j/preprocess').parseDates;

var logValues = require('koa-neo4j/debug').logValues;

var errorOnEmptyResult = require('koa-neo4j/postprocess').errorOnEmptyResult;
var fetchOne = require('koa-neo4j/postprocess').fetchOne;
var convertToPreProcess = require('koa-neo4j/postprocess').convertToPreProcess;

var articlesAfterDate = app.createProcedure({
    preProcess: [
        parseIds('author_id'),
        parseDates({'timestamp': 'date'}),
        logValues
    ],
    cypherQueryFile: './cypher/articles_after_date.cyp',
    postProcess: [
        logValues,
        errorOnEmptyResult('author not found'), // returns this message with a 404 http code
        fetchOne,
        convertToPreProcess('articles') // assigns params.articles to result of procedure
    ]
});

var blogsAfterDate = app.createProcedure({
    // ...
});

app.defineAPI({
    allowedRoles: ['admin'],
    route: '/author-activity/:author_id/:timestamp',
    preProcess: [
        articlesAfterDate,
        blogsAfterDate,
        function (params) {
            params.result = {
                // params.date is created by parseDates hook function in articlesAfterDate
                interval: `past ${new Date().getDate() - params.date.getDate()} days`,
                articles: params.articles,
                blogs: params.blogs
            }
        }
    ]
})
```

A `defineAPI` block can reuse a procedure's body via `procedure` key:

```javascript
app.defineAPI({
    method: 'POST',
    route: '/some-api',
    procedure: some_procedure
})
```

### License

[MIT](https://github.com/assister-ai/koa-neo4j/blob/master/LICENSE)
