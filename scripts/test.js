import Jasmine from "jasmine";
import {JUnitXmlReporter, TapReporter} from "jasmine-reporters";

var jasmine = new Jasmine();
jasmine.loadConfigFile('test/support/jasmine.json');

jasmine.addReporter(new TapReporter());
jasmine.addReporter(new JUnitXmlReporter());

jasmine.execute();
