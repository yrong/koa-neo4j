/**
 * Created by keyvan on 11/26/16.
 */

import {parseIds} from './preprocess';
import {fetchOne} from './postprocess';

class Procedure {
    constructor({
        cypherQueryFile, cypher, check = (params, user) => true,
        preProcess = params => params, postProcess = result => result, postServe = result => result,
        name = 'createProcedure'
    } = {}) {
        this.cypherQueryFile = cypherQueryFile;
        this.cypher = cypher;
        this.check = check;
        this.preProcess = preProcess;
        this.postProcess = postProcess;
        this.postServe = postServe;
        this.name = name;
        // instanceof doesn't work due to webpack
        this.isProcedure = true;
    }
}

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
            (params, ctx) => [params, except(params, ctx)],
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

export {Procedure, checkOwner};
