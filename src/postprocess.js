/**
 * Created by keyvan on 11/20/16.
 */

const logResult = (result) => {
    console.log(JSON.stringify(result, null, 2));
    return result;
};

const fetchOne = (result) => {
    return Array.isArray(result) ? result[0] : result;
};

const errorOnEmptyResult = (message) => (result) => {
    if (typeof result === 'undefined' || result === null || Array.isArray(result)
        && (result.length === 0 || result.length === 1 && result[0] === null))
        throw new Error(message);
    return result;
};

const map = (func) => (result) => {
    return Array.isArray(result) ? result.map(func) : func(result);
};

const convertToPreProcess = (variableNameToAppendToParams) => (result, params) => {
    params[variableNameToAppendToParams] = result;
    return params;
};

export {logResult, fetchOne, errorOnEmptyResult, map, convertToPreProcess};
