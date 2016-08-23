# koa-neo4j
> Easily map cypher queries to REST routes

### Install
```bash
npm install koa-neo4j --save
```

### Usage
```javascript
var koaNeo4jApp = require("koa-neo4j");
var app = koaNeo4jApp(opts);
app.listen(3000, function () {
	console.log('App listening on port 3000.');
});
```

First argument, `method`, specifies the request types (GET|POST|DEL)

Second argument, `route`, denotes the route

`cypher_query_file_name` corresponds to a `.cyp` file located in `./cypher`

Last argument, `then`, takes a function which is invoked after each successful cypher execution for this route.

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

### License
[MIT](https://github.com/satratech/koa-neo4j/blob/master/LICENSE)
