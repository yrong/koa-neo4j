/**
 * Created by keyvan on 8/31/16.
 */
var Jasmine = require('jasmine');
var SpecReporter = require('jasmine-spec-reporter');
var noop = function() {};

var runner = new Jasmine();
jasmine.getEnv().addReporter(new SpecReporter());   // add jasmine-spec-reporter
runner.loadConfigFile();                           // load jasmine.json configuration
runner.execute();
