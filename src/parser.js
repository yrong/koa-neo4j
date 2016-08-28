/**
 * Created by keyvan on 8/27/16.
 */
import {enumerate, keyValues} from './util';

const hasProperties = obj => obj.properties && obj.identity && obj.identity.low;

const parseField = field => {
    // If null or value
    if (!field || typeof field !== 'object')
        return field;
    else
        // If it's a number
        if ((field.low || field.low === 0) && field.high === 0)
            return field.low;
        // If it's an array
        else if (field['0']) {
            const result = [];
            let index = 0;
            let current = field['0'];
            while (current) {
                result.push(parseField(current));
                index++;
                current = field[String(index)];
            }
            return result;
        } else { // It's an object by this point
            const properties = hasProperties(field) ? field.properties : field;
            const result = {};
            for (let [key, value] of keyValues(properties)) {
                value = parseField(value);
                result[key] = value;
            }
            return result;
        }
};

const parseNeo4jResponse = response => {
    const result = [];
    for (const record of response.records)
        if (record.length == 1)
            result.push(parseField(record._fields[0]));
        else {
            const parsedRecord = {};
            for (const [index, key] of enumerate(record.keys))
                parsedRecord[key] = parseField(record._fields[index]);
            result.push(parsedRecord);
        }
    return result;
};

export default parseNeo4jResponse;
