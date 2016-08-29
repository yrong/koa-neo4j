/**
 * Created by keyvan on 8/29/16.
 */
import {neo4jInt} from './data';

const parseId = params => {
    params.id = neo4jInt(params.id);
    return params;
};

const parseSkipAndLimit = params => {
    params.skip = parseInt(params.skip);
    params.limit = parseInt(params.limit);
    return params;
};

const preProcessors = {parseId, parseSkipAndLimit};

export {preProcessors};
