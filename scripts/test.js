var debug = require('debug')('scripts:test');
var Jasmine = require('jasmine');
var JasmineConsoleReporter = require('jasmine-console-reporter');
var JasmineReporters = require('jasmine-reporters');

var jasmine = new Jasmine();
jasmine.loadConfigFile('test/support/jasmine.json');

jasmine.addReporter(new JasmineConsoleReporter({
	  colors: 1,
	  cleanStack: 1,
	  verbosity: 4,
	  listStyle: 'indent',
	  activity: false
}));
jasmine.addReporter(new JasmineReporters.JUnitXmlReporter());

jasmine.execute();
