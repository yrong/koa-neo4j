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

const then = Then;

const and = And;

// const mapping = {
//     given: (description) => given(description.given, description.onGiven, true),
//     givenOnce: (description) => given(description.givenOnce, description.onGiven),
//     when: (description) => when(description.when, description.onWhen, true),
//     whenOnce: (description) => when(description.whenOnce, description.onWhen),
//     then: (description) => then(description.then, description.onThen),
//     onGiven: true,
//     onWhen: true,
//     onThen: true
// };
//
// const executeRecursive = (description, parent) => {
//     if (parent)
//         describe(parent, () => {
//             for (const func of executeRecursive(description))
//                 func(description);
//         });
//
//     const children = [];
//     for (const key of Object.keys(description))
//         if (!mapping[key])
//             executeRecursive(description[key], key);
//         else if (mapping[key] !== true)
//             children.push(mapping[key]);
//     return children;
// };
//
// const execute = (description) => executeRecursive(description);

export {given as Given, when as When, then as Then, and as And};
