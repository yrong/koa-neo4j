/**
 * Created by keyvan on 8/29/16.
 */

import {v1 as neo4j} from 'neo4j-driver';

const neo4jInt = neo4j.int;

const parseWith = (func) => (...keys) => params => {
    for (const key of keys)
        if (params[key])
            params[key] = func.apply(this, [params[key]]);
    return params;
};

const parseNeo4jInts = parseWith(neo4jInt);

const parseInts = parseWith(parseInt);

const parseFloats = parseWith(parseFloat);

export {Integer} from 'neo4j-driver/lib/v1/integer';
export {parseWith, parseNeo4jInts, parseInts, parseFloats, neo4jInt};
