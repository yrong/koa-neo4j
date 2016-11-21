/**
 * Created by keyvan on 11/20/16.
 */

const logResult = (result) => {
    console.log(JSON.stringify(result, null, 2));
    return result;
};

const fetchOne = (result) => result[0];

const errorOnEmptyResult = (message) => (result) => {
    if (!result || Array.isArray(result) && result.length === 0)
        throw new Error(message);
    return result;
};

const map = (func) => (result) => result.map(func);

const convertToPreProcess = (variableNameToAppendToParams) =>
    (result, params) => {
        params[variableNameToAppendToParams] = result;
        return params;
};

export {logResult, fetchOne, errorOnEmptyResult, map, convertToPreProcess};
