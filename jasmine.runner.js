/**
 * Created by keyvan on 8/31/16.
 */
var Jasmine = require('jasmine');
var SpecReporter = require('jasmine-spec-reporter');
var noop = function() {};

var runner = new Jasmine();
jasmine.getEnv().addReporter(new SpecReporter());
jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
runner.loadConfigFile();
runner.execute();
