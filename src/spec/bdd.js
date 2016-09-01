/**
 * Created by keyvan on 8/31/16.
 */

import chalk from 'chalk';
import 'jasmine-given';

const context = {};

const getExecutor = (func, before, executeEachTime) => {
    let executed = false;
    return func.length > 0 ? (done) => {
        before();
        if (!executed) {
            func.apply(context, [done]);
            executed = true;
        }
        console.log('   done');
    } : () => {
        before();
        if (!executed) {
            func.apply(context, []);
            executed = true;
        }
        console.log('   done');
    };
};

const given = (description, onGiven, executeEachTime) => {
    Given(getExecutor(onGiven,
        () => console.log(chalk.blue(`\ngiven ${description}`)), executeEachTime));
};

const when = (description, onWhen, executeEachTime) => {
    When(getExecutor(onWhen,
        () => console.log(chalk.magenta(`\nwhen ${description}`))), executeEachTime);
};

const then = Then;

const and = And;

export {given, when, then, and};
