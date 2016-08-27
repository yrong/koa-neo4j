# koa-neo4j
> Easily map cypher queries to REST routes

### Install
```bash
npm install koa-neo4j --save
```

### Usage
You can find a comprehensive example at [koa-neo4j-example](https://github.com/satratech/koa-neo4j-example) 
```javascript
var koaNeo4jApp = require('koa-neo4j').default;

var app = koaNeo4jApp({
    apis: [
        {
            method: 'GET',
            route: '/articles',
            cypherQueryFile: './cypher/articles.cyp'
        },
        {
            method: 'POST',
            route: '/articles',
            cypherQueryFile: './cypher/articles.cyp'
        }
    ],
    database: {
        boltUrl: 'bolt://localhost',
        user: 'neo4j',
        password: 'k'
    },
    authentication: {
        userQueryCypherFile: './cypher/auth.cyp',
        route: '/auth',
        secret: 'secret'
    }
});

app.listen(3000, function () {
    console.log('App listening on port 3000.');
});

```

An API is defined by five keys:

`method`, specifies the request types (GET|POST|DEL)

`route`, denotes the route

`cypherQueryFile` path to the the `.cyp` corresponding to this route

`postProcess` a function for performing post-processing on the result

`allowedRoles` an array specifying the roles permitted to access the route

Cypher files accept parameters via curly brace syntax:
```cypher
MATCH (a:Article)
MATCH (a)-[:AUTHOR]->(au)
RETURN a AS article, au AS author
ORDER BY a.created_at DESC
SKIP {skip} LIMIT {limit}
```

These parameters are matched with url parameters `/articles?skip=10&limit=10` or route parameters `/articles/:skip/:limit`.

In addition, any data accompanied by the request will also be passed to the Cypher query, retaining it's name:
```bash
curl --data "skip=10&limit=1000" localhost:3000/articles
```

### Authentication
Needs docs

### License
[MIT](https://github.com/satratech/koa-neo4j/blob/master/LICENSE)
