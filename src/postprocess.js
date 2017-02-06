/**
 * Created by keyvan on 11/20/16.
 */

const fetchOne = (result) => {
    return Array.isArray(result) ? result[0] : result;
};

const onEmptyResult = (fn) => (result, params, ctx) => {
    if (typeof result === 'undefined' || result === null || Array.isArray(result)
        && (result.length === 0 || result.length === 1 && result[0] === null))
        return fn.call(ctx, result, params, ctx);
    return result;
};

const customError = (message, httpCode) => (result, params, ctx) =>
    ctx.throw(message, httpCode);

const errorOnEmptyResult = (message, httpCode = 404) => onEmptyResult(customError(message, httpCode));

const map = func => result => {
    return Array.isArray(result) ? result.map(func) : func.apply(null, [result]);
};

const convertToPreProcess = variableNameToAppendToParams => (result, params) => {
    params[variableNameToAppendToParams] = result;
    return params;
};

export {logValues as logResult} from './debug';
export {fetchOne, onEmptyResult, customError, errorOnEmptyResult, map, convertToPreProcess};
