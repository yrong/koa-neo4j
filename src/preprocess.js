/**
 * Created by keyvan on 8/29/16.
 */
import {neo4jInt} from './data';

const parseWith = (func) => (...keys) => params => {
    for (const key of keys)
        params[key] = func.apply(this, [params[key]]);
    return params;
};

const parseId = parseWith(neo4jInt);

const parseIntegers = parseWith(parseInt);

export {parseWith, parseId, parseIntegers};
