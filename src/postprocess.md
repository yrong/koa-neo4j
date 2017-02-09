# postProcess built-in hook functions

## fetchOne

Returns result if result is not an array, returns first element otherwise.

```javascript
var fetchOne = require('koa-neo4j/postprocess').fetchOne;

app.defineAPI({
    // ..
    postProcess: fetchOne
    // ..
});
```

## errorOnEmptyResult

Allows issuing an error if the result's length is zero, with the ability to specify an http error code.
Default http error code for this hook function is `404`.

```javascript
var errorOnEmptyResult = require('koa-neo4j/postprocess').errorOnEmptyResult;

app.defineAPI({
    // ..
    postProcess: errorOnEmptyResult('query did not match any results', 500)
    // ..
});
```

## map

Executes a function on each element of the result, gathers return values as the new result.

```javascript
var map = require('koa-neo4j/postprocess').map;
var errorOnEmptyResult = require('koa-neo4j/postprocess').errorOnEmptyResult;

app.defineAPI({
    // ..
    postProcess: [
        errorOnEmptyResult('query did not match any results'),
        map(function(element) {
            return element.someValue;
        })
    ]
    // ..
});
```

## convertToPreProcess

Converts a procedure to a preProcess hook function, result would be assigned to `params.<key>` where key is the name
you've supplied as the argument to `convertToPreProcess`

```javascript
var convertToPreProcess = require('koa-neo4j/postprocess').convertToPreProcess;
var parseIds = require('koa-neo4j/preprocess').parseIds;

var getAuthorId = app.createProcedure({
    // ...
    postProcess: [
        // ...
        // we need to provide the key
        convertToPreProcess('author_id'),
        // becomes params.author_id
        parseIds('author_id')
    ],
});

app.defineAPI({
    // ...
    preProcess: [
        // ...
        getAuthorId,
        function(params) {
            console.log(params.author_id);
            // logs result of getAuthorId
            return params;
        }
        // ...
    ],
    // ...
})
```
