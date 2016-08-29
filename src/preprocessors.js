/**
 * Created by keyvan on 8/29/16.
 */
import {neo4jInt} from './data';

const parseId = () => params => {
    params.id = neo4jInt(params.id);
    return params;
};

const parseIntegers = (...keys) => params => {
    for (const key of keys)
        params[key] = parseInt(params[key]);
    return params;
};

const preProcessors = {parseId, parseIntegers};

export {preProcessors};
