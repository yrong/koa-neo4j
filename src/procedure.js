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
// params before: {resourceIdParamName} <number> | <string>
// params after: {resourceIdParamName} <Neo4jInt>
const checkOwner = ({
    resourceIdParamName = 'id', matchClause = 'MATCH (user)-[:HAS]->(resource)',
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
                    params.cypher = `${matchClause} WHERE id(user) = ${ctx.user.id}` +
                        `AND id(resource) = {${resourceIdParamName}} ` +
                        'RETURN count(resource)';
                return params;
            }
        ],
        postProcess: fetchOne
    });

export {Procedure, checkOwner};
