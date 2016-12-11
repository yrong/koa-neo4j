/**
 * Created by keyvan on 8/29/16.
 */

import {v1 as neo4j} from 'neo4j-driver';

const neo4jInt = neo4j.int;

const logParams = params => {
    console.log(JSON.stringify(params, null, 2));
    return params;
};

const deepParse = (params, key, func) => {
    let [keyToFind, keyToReplace] = [key, key];
    if (typeof key === 'object') {
        const keys = Object.keys(key);
        if (keys.length !== 1) {
            for (const keyToFind of keys) {
                const newKey = {};
                newKey[keyToFind] = key[keyToFind];
                deepParse(params, newKey, func)
            }
            return;
        }
        else {
            keyToFind = keys[0];
            keyToReplace = key[keyToFind];
        }
    }
    if (params[keyToFind])
        if (!Array.isArray(params[keyToFind]))
            params[keyToReplace] = func.apply(params, [params[keyToFind]]);
        else {
            const toReplace = [];
            for (const value of params[keyToFind])
                toReplace.push(func.apply(params, [value]))
            params[keyToReplace] = toReplace;
        }
    for (const innerKey of Object.keys(params))
        if (params[innerKey] !== null && typeof params[innerKey] === 'object')
            deepParse(params[innerKey], key, func);
};

const parseWith = (func) => (...keys) => params => {
    for (const key of keys)
        deepParse(params, key, func);
    return params;
};

const parseNeo4jInts = parseWith(neo4jInt);

const parseIds = parseNeo4jInts;

const parseInts = parseWith(parseInt);

const parseFloats = parseWith(parseFloat);

const parseDates = parseWith(stringOrUnixTime => {
    const parsedInt = parseInt(stringOrUnixTime);
    stringOrUnixTime = parsedInt.toString() !== stringOrUnixTime.toString() || isNaN(parsedInt) ?
        stringOrUnixTime : parsedInt;
    return new Date(stringOrUnixTime);
});

const parseUnixTimes = parseWith(stringOrUnixTime => {
    const parsedInt = parseInt(stringOrUnixTime);
    if (parsedInt.toString() === stringOrUnixTime.toString())
        return neo4jInt(parsedInt);
    return neo4jInt(new Date(stringOrUnixTime).getTime());
});

export {Integer} from 'neo4j-driver/lib/v1/integer';
export {neo4jInt, logParams, parseWith, parseNeo4jInts, parseIds,
    parseInts, parseFloats, parseDates, parseUnixTimes};
