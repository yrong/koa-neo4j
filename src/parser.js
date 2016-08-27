/**
 * Created by keyvan on 8/27/16.
 */
import {enumerate, keyValues} from './util';

const parseField = field => {
    const hasProperties = field.properties && field.identity && field.identity.low;
    const properties = hasProperties ? field.properties : field;
    const result = {};
    for (let [key, value] of keyValues(properties)) {
        if (value && value.low && value.high === 0)
            value = value.low;
        result[key] = value;
    }
    return result;
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
