/**
 * Created by keyvan on 8/31/16.
 */

import chalk from 'chalk';
import 'jasmine-given';
import {keyValues} from './util';

const context = {};

const alreadyExecuted = new Set();

const getExecutor = (func, before, description,  executeEachTime) => {
    executeEachTime = typeof executeEachTime === 'undefined' ? false : executeEachTime;
    return func.length > 0 ? (done) => {
        before();
        if (executeEachTime || !alreadyExecuted.has(description)) {
            func.apply(context, [done]);
            alreadyExecuted.add(description);
        } else
            done();
    } : () => {
        before();
        if (executeEachTime || !alreadyExecuted.has(description)) {
            func.apply(context, []);
            alreadyExecuted.add(description);
        }
    };
};

const given = (description, onGiven, executeEachTime) => {
    Given(getExecutor(onGiven,
        () => console.log(chalk.blue(`\ngiven ${description}`)), description, executeEachTime));
};

const when = (description, onWhen, executeEachTime) => {
    When(getExecutor(onWhen,
        () => console.log(chalk.magenta(`\nwhen ${description}`)), description, executeEachTime));
};

const then = Then;

const and = And;

const parse = (description) => {

};

export {given, when, then, and};
