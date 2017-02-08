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
            route: '/articles/:skip/:limit',
            cypherQueryFile: './cypher/articles.cyp'
        },
        {
            method: 'POST',
            route: '/article',
            cypherQueryFile: './cypher/create_article.cyp'
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

`route`, the path to this API (e.g. the first becomes http://localhost:3000/articles)

`cypherQueryFile`, path to the the `.cyp` file corresponding to this route

Optionally you can specify roles whom can access this route with `allowedRoles` and
also [lifecycle hooks](#lifecycle-hooks)

Cypher queries, accept parameters via the curly brace syntax:
```cypher
MATCH (a:Article)
MATCH (a)-[:AUTHOR]->(au)
RETURN a AS article, au AS author
ORDER BY a.created_at DESC
SKIP $skip LIMIT $limit
```

These parameters are matched with url parameters `/articles?skip=10&limit=10` or route parameters `/articles/:skip/:limit`.

In addition, any data accompanied by the request will also be passed to the Cypher query, with the same variable names:
```bash
curl --data "title=The%20Capital%20T%20Truth&author=David%20Foster%20Wallace" localhost:3000/article
```
becomes a POST request, {"title": "The Capital T Truth", "author": "David Foster Wallace"} will be
passed to `./cypher/create_article.cyp` which can refer to these parameters by `$title` and `$author`

### Authentication
Authentication is facilitated through [JSON web token](https://github.com/auth0/node-jsonwebtoken), all it takes to
have authentication in your app is to supplement `Authentication config object` either with `authentication` key
when initiating the app instance or by `configureAuthentication` method:
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

    // rolesCypherQueryFile, optional. Invoked with `$id` returned from userCypherQueryFile, this query is expected to
    // return a list of strings describing roles of this user, you can do all sorts of traverses that cypher allows
    // to generate this list. Defaults to labels of the node matching the id:
    // `MATCH (user) WHERE id(user) = $id RETURN {roles: labels(user)}`
    rolesCypherQueryFile: './cypher/roles.cyp'
});
```
After authentication is configured, you can access it by the route you specified:

![Invoking Authentication](https://github.com/assister-ai/koa-neo4j/raw/master/images/invoking_auth.png "Invoking Authentication")

Note that if you don't set `remember: true`, the generated token expires in an hour.

Returned object contains a `token` which should be supplemented as `Authorization` header
in subsequent calls to routes that have `allowedRoles` protection.

In addition, a `user` object is returned that matches the object returned by `userCypherQueryFile` except
for the `password` key, which is deleted (so that security won't be compromised should
clients decide to save this object) and `roles` key, which is the object returned by `rolesCypherQueryFile`.

### Lifecycle hooks
TODO: docs

### Procedures
TODO: docs

### License
[MIT](https://github.com/assister-ai/koa-neo4j/blob/master/LICENSE)
