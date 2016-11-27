/**
 * Created by keyvan on 11/26/16.
 */

import {parseIds} from './preprocess';
import {fetchOne} from './postprocess';
import {Procedure} from './data';

const checkWith = ({
    name = 'checkWith',
    condition = (params, ctx) => true,
    except = (params, ctx) => false
} = {}) =>
    new Procedure({
        name: name,
        preProcess: [
            (params, ctx) => [params, except.apply(null, [params, ctx])],
            ([params, exception], ctx) => {
                if (exception)
                    params.result = exception;
                else
                    params.result = func.apply(null, [params, ctx]);
                return params;
            }
        ]
    });

// check Hook
// checkOwner
// params before: {resourceIdParamName} <number> | <string> | <Neo4jInt>
// params after: {resourceIdParamName} <Neo4jInt>
const checkOwner = ({
    resourceIdParamName = 'id',
    pattern = '(user)-[:HAS]->(resource)',
    matchClause, query,
    // matchClause = 'MATCH (user)-[:HAS]->(resource)',
    // query = 'MATCH (user)-[:HAS]->(resource) ' +
    //          'WHERE id(user) = 102 AND id(resource) = 103 RETURN count(resource)',
    except = (params, ctx) => false
} = {}) =>
    new Procedure({
        name: 'checkOwner',
        preProcess: [
            parseIds(resourceIdParamName),
            (params, ctx) => [params, except.apply(null, [params, ctx])],
            ([params, exception], ctx) => {
                if (exception)
                    params.result = exception;
                else
                    params.cypher = query || matchClause ?
                        `${matchClause} WHERE id(user) = ${ctx.user.id} ` +
                            `AND id(resource) = {${resourceIdParamName}} ` +
                            'RETURN count(resource)' :
                        `$MATCH ${pattern} WHERE id(user) = ${ctx.user.id} ` +
                            `AND id(resource) = {${resourceIdParamName}} ` +
                            'RETURN count(resource)';
                return params;
            }
        ],
        postProcess: fetchOne
    });

// Use allowedRoles for this functionality
// Made to be used as 'except', e.g. in checkOwner({ except: userHasAnyOfRoles(['admin', 'reviewer']) })
const userHasAnyOfRoles = roles => (params, ctx) => {
    if (!ctx.user)
        throw new Error('user not logged in');
    for (const role of roles)
        if (ctx.user.roles.indexOf(role) > 0)
            return true;
    return false;
};

const userIsAdmin = userHasAnyOfRoles(['admin']);

export {checkWith, checkOwner, userHasAnyOfRoles, userIsAdmin};
