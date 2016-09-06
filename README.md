[![npm version](https://badge.fury.io/js/koa-neo4j.svg)](https://www.npmjs.com/package/koa-neo4j) [![Build Status](https://travis-ci.org/satratech/koa-neo4j.svg?branch=master)](https://travis-ci.org/satratech/koa-neo4j)
# koa-neo4j
`koa-neo4j` is a framework for creating web servers that embody application's logic powered by a [Neo4j Graph Database](https://neo4j.com/) backend.

In a Neo4j enabled application, conducting queries directly from client side might not be the best choice:

- Database is exposed to the client, unless some explicit security mechanism is in place; one can *see* the innards of the database by `View page source`
- There is no **one server to rule them all**, queries are `string`s, scattered around different clients (web, mobile, etc.)
- Third-party developers might not be familiar with Cypher

`koa-neo4j` addresses all of the above issues:

- Stands as a middle layer between clients and database 
- Gives structure to your server's logic in form of a file-based project; finally a home for Cypher! All of the clients can then talk to an instance of this server
- Converts Cypher files to REST routes, a cross-platform web standard that developers are familiar with, it does so on top of the widely-adapted [**koa**](http://koajs.com/) server, ripe for further customization
 
In addition it comes with *goodies*:
 
- Lifecycle hooks, enabling one to tweak incoming and outgoing data based on one's needs, allowing her to utilize the full power of `nodejs` and `javascript` ecosystem in the process
- Non-opinionated user management, you describe (in Cypher) how your users and roles are stored, the framework provides authentication and role-based access management

### Install
```bash
npm install koa-neo4j --save
```

### Usage
You can find a comprehensive example at [koa-neo4j-example](https://github.com/satratech/koa-neo4j-example) 
```javascript
var KoaNeo4jApp = require('koa-neo4j');

var app = new KoaNeo4jApp({
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
    ],
    neo4j: {
        boltUrl: 'bolt://localhost',
        user: 'neo4j',
        password: '<YOUR_NEO4j_PASSWORD>'
    }
});

app.listen(3000, function () {
    console.log('App listening on port 3000.');
});

```

An API is defined by at least three keys:

`method`, specifies the request type (GET|POST|DEL)

`route`, the path to this API (e.g. your.server.com/)

`cypherQueryFile`, path to the the `.cyp` file corresponding to this route

Cypher queries, accept parameters via the curly brace syntax:
```cypher
MATCH (a:Article)
MATCH (a)-[:AUTHOR]->(au)
RETURN a AS article, au AS author
ORDER BY a.created_at DESC
SKIP {skip} LIMIT {limit}
```

These parameters are matched with url parameters `/articles?skip=10&limit=10` or route parameters `/articles/:skip/:limit`.

In addition, any data accompanied by the request will also be passed to the Cypher query, with the same variable names:
```bash
curl --data "title=The%20Capital%20T%20Truth&author=David%20Foster%20Wallace" localhost:3000/article
```
becomes {title} and {author} passed to `./cypher/create_article.cyp`

### Lifecycle hooks
TODO: docs

### Authentication
TODO: docs

### License
[MIT](https://github.com/satratech/koa-neo4j/blob/master/LICENSE)
