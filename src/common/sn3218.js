import i2cBus from 'i2c-bus';
import dbg from 'debug';
import fs from 'fs';

const debug = dbg('dot:common:sn3218');

export class SN3218 {
  constructor() {
    this.i2c = i2cBus.openSync(this._i2cBusId())
  }

  _i2cBusId() {
    let revision = fs.readFileSync('/proc/cpuinfo').toString().split("\n").filter(function(line) {
      return line.indexOf('Revision') === 0;
    })[0].split(":")[1].trim();
    return parseInt(revision, 16) >= 4 ? 1 : 0;
  }
}
