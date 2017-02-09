# preProcess built-in hook functions

## parseWith

parseWith is a [higher order function](https://en.wikipedia.org/wiki/Higher-order_function) that takes conversion method
for one value as input and returns a preProcess hook function that takes arbitrary number of keys as argument and then
goes deep in `params`, changing the value of each key to it's parsed value.

A key is either a string or an object mapping one string to another (parsed value would be assigned to `keyToReplace` in
keys specified as {'keyToFind': 'keyToReplace'})

```javascript
var parseWith = require('koa-neo4j/preprocess').parseWith;

// http://stackoverflow.com/questions/1494671/regular-expression-for-matching-time-in-military-24-hour-format
var parseMilitaryHour = parseWith(function(hourString) {
    return parseInt(/^([01]\d|2[0-3]):?([0-5]\d)$/.exec(hourString)[0]);
});

app.defineAPI({
    // ...
    preProcess: [
        parseIds('soldier_id', 'commander_id'),
        parseMilitaryHour(
            {'present_time': 'present_hour'},
            {'absent_time': 'absent_hour'}
        ),
        // ...
    ],
    // ...
});
```

built-in `parse*` methods are all derivatives of `parseWith`.

## parseIds

Equivalent of `parseNeo4jInts`, renamed to be idiomatic

## parseNeo4jInts

Neo4j integer type is 64 bits and hence inconsistent with JavaScript's 53 bits integer type. This hook function parses a
string or a JS integer into
[integer type consistent with neo4j](http://neo4j.com/docs/api/javascript-driver/current/class/src/v1/integer.js~Integer.html).

Cypher only works with integers of type Neo4j integer.

## parseUnixTimes

Converts a UnixTime string or integer to a Neo4jInt, making it ready for Cypher to work with.

## parseDates

Converts a string or UnixTime into a JavaScript `Date` object.

## parseInts

Parses keys as JavaScript integer values.

## parseFloats

Parses keys as JavaScript float values.
