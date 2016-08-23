/**
 * Created by keyvan on 8/23/16.
 */
const chalk = require("chalk");
try {
    require("babel-polyfill");
}
// Error: only one instance of babel-polyfill is allowed
catch (error) {chalk.yellow(console.log(error.message + ", using previous one"));}
module.exports = require("./main");
