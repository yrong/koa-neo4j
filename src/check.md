# check built-in hook functions

## checkWith

Checks for a condition to hold, with the ability to specify an exception.

```javascript
// Example:
// check that the user invoking the API matches the user with `id` of params.id
var checkWith = require('koa-neo4j/check').checkWith;
var userIs = require('koa-neo4j/check').userIs;

var checkUserIsSelfOrAdmin = checkWith({
    // Providing a name facilitates debugging
    name: 'checkUserIsSelfOrAdmin',
    
    // `condition` is a hook function with `(params[, ctx]) -> :boolean` signature
    condition: function(params, ctx) {
        return params.id.toString() === ctx.user.id.toString();
    },

    // `except` is a hook function with `(params[, ctx]) -> :boolean` signature
    except: userIs('admin')
});

app.defineAPI({
    // ...
    check: checkUserIsSelfOrAdmin,
    // ...
})
```

## checkOwner

`allowedRoles` should be present for `checkOwner` to work. Finds a `user` node with the `id` matching `ctx.user.id`,
then checks that `pattern` holds between `user` node and a `resource` node with the `id` matching the value of
`resourceIdParamName` in params.

```javascript
// Example:
// check that the user invoking the API satisfies (user)-[:CREATED]->(article) pattern
var checkOwner = require('koa-neo4j/check').checkOwner;
var userIs = require('koa-neo4j/check').userIs;

app.defineAPI({
    // ...
    check: checkOwner({
        // Providing a name facilitates debugging
        name: 'checkOwnsArticleOrIsAdmin',

        // We need to tell checkOwner that resource's `id` is supplied in params.article_id
        resourceIdParamName: 'article_id',  // if not present, defaults to params.id

        // Use names `user` and `resource` to denote a pattern to match against
        pattern: '(user)-[:CREATED]->(resource)',

        // If except returns true, pattern won't be checked.
        except: userIs('admin')
    }),
    // ...
})
```
