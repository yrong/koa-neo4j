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
The MIT License (MIT)

Copyright (c) 2016 Satratech

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
