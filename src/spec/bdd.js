/**
 * Created by keyvan on 8/31/16.
 */

import chalk from 'chalk';
import 'jasmine-given';
import {cypherQueryFilePathFor} from './util';

const givens = {};
const whens = {};
const thens = {};

const context = {};

const getExecutor = (func, before) => {
    return func.length > 0 ? (done) => {
        before();
        func.apply(context, [done]);
    } : () => {
        before();
        func.apply(context, []);
    };
};

let given = (description, onGiven) => {
    if (onGiven)
        givens[description] = Given(getExecutor(onGiven, () =>
            console.log(chalk.blue(`\ngiven ${description}`))));
    return givens[description];
};

let when = (description, onWhen) => {
    if (onWhen)
        whens[description] = When(getExecutor(onWhen, () =>
            console.log(chalk.magenta(`\nwhen ${description}`))));
    return whens[description];
};

let then = (description, onThen) => {
    if (onThen)
        thens[description] = Then(description, onThen);
    return thens[description];
};

export {given, when, then};
