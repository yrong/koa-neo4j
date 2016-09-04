/**
 * Created by keyvan on 8/31/16.
 */

import chalk from 'chalk';
import 'jasmine-given';

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

const then = (description, onThen) =>
    Then(description, getExecutor(onThen, () => {}, description, true));

const invariant = (description, onInvariant) =>
    Invariant(description, getExecutor(onInvariant, () => {}, description, true));

const bdd = {
    given: (description, onGiven) => given(description, onGiven, true),
    givenOnce: given,
    when: (description, onWhen) => when(description, onWhen, true),
    whenOnce: when,
    then: then,
    invariant: invariant,
    appendToContext(key, value) { context[key] = value; }
};

export default bdd;
