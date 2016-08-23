/**
 * Created by keyvan on 8/23/16.
 */
try {
    require("babel-polyfill");
} catch (error) {console.warn(error.message + ", using previous one");}
require("./main");