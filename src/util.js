/**
 * Created by keyvan on 8/22/16.
 */

function *keyValues(obj) {
    for (const key of Object.keys(obj))
        yield [key, obj[key]];
}

const haveIntersection = (arrayFirst, arraySecond) => {
    if (!arrayFirst || !arraySecond)
        return false;
    const first = new Set(arrayFirst);
    const second = new Set(arraySecond);
    for (const element of first)
        if (second.has(element))
            return true;
    return false;
};

const readMissingFromDefault = (obj, defaultValues) => {
    if (!obj)
        return Object.assign({}, defaultValues);
    const result = {};
    for (const [key, value] of keyValues(defaultValues))
        result[key] = obj[key] ? obj[key] : value;
    return result;
};

function* enumerate(array) {
    let index = 0;
    for (const element of array) {
        yield [index, element];
        index++;
    }
}

const pipe = (...functions) => (...args) => {
    for (const func of functions)
        if (Array.isArray(args))
            args = func.apply(this, args);
        else
            args = func.apply(this, [args]);
    return args;
};

export {keyValues, haveIntersection, readMissingFromDefault, enumerate, pipe};
