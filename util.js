/**
 * Created by keyvan on 8/22/16.
 */

function* key_values(obj) {
    for (let key of Object.keys(obj)) {
        yield [key, obj[key]];
    }
}

let have_intersection = (arrayFirst, arraySecond) => {
    if (!arrayFirst || !arraySecond)
        return false;
    let first = new Set(arrayFirst);
    let second = new Set(arraySecond);
    for (let element of first)
        if (second.has(element))
            return true;
    return false;
};

export {key_values, have_intersection};