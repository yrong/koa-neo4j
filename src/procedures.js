/**
 * Created by keyvan on 11/26/16.
 */

import {Procedure} from './data';
import {parseIds} from './preprocess';
import {fetchOne} from './postprocess';

// check Hook
// checkOwner
// params before: {resourceIdParamName} <number> | <string>
// params after: {resourceIdParamName} <Neo4jInt>
const checkOwner = (resourceIdParamName = 'id', matchClause = 'MATCH (user)-[:HAS]->(resource)') =>
    new Procedure({
        name: 'checkOwner',
        preProcess: [
            parseIds(resourceIdParamName),
            (params, ctx) => {
                params.cypher = `${matchClause} WHERE id(user) = ${ctx.user.id}` +
                    `AND id(resource) = {${resourceIdParamName}} ` +
                    'RETURN count(resource)';
                return params;
            }
        ],
        postProcess: fetchOne
    });

export {checkOwner};
