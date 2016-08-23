/**
 * Created by keyvan on 8/23/16.
 */
try {
    require("babel-polyfill");
}
// Error: only one instance of babel-polyfill is allowed
catch (error) {console.warn(error.message + ", assuming already running within polyfill");}
module.exports = require("./main");
