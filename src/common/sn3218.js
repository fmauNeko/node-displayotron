import i2cBus from 'i2c-bus';
import dbg from 'debug';
import fs from 'fs';

const debug = dbg('dot:common:sn3218');

export class SN3218 {
  constructor() {
    this.i2c = i2cBus.openSync(this._i2cBusId());
    this.i2cAddr = 0x54;
    this.defaultGammaTable = [...Array(256).keys()].map(i => Math.trunc(Math.pow(255, (i - 1) / 255)));
    this.channelGammaTable = new Array(18).fill(this.defaultGammaTable);

    this.enableLeds(0b111111111111111111);
  }

  enable() {
    let buf = Buffer.from([0x01]);
    this.i2c.writeBlockSync(this.i2cAddr, 0x00, buf.length, buf);
  }

  disable() {
    let buf = Buffer.from([0x00]);
    this.i2c.writeBlockSync(this.i2cAddr, 0x00, buf.length, buf);
  }

  reset() {
    let buf = Buffer.from([0xFF]);
    this.i2c.writeBlockSync(this.i2cAddr, 0x17, buf.length, buf);
  }

  enableLeds(enableMask) {
    if (typeof(enableMask) !== 'number') {
      throw new TypeError('enableMask must be a number');
    }

    let buf = Buffer.from([enableMask & 0x3F, (enableMask >> 6) & 0x3F, (enableMask >> 12) & 0x3F]);
    this.i2c.writeBlockSync(this.i2cAddr, 0x13, buf.length, buf);

    buf = Buffer.from([0xFF]);
    this.i2c.writeBlockSync(this.i2cAddr, 0x16, buf.length, buf);
  }

  channelGamma(channel, gammaTable) {
    if (typeof(channel) !== 'number') {
      throw new TypeError('channel must be a number');
    }

    if (channel < 0 || channel > 17) {
      throw new RangeError('contrast must be an integer in the range 0..17');
    }

    if (!Array.isArray(gammaTable) || gammaTable.length !== 256) {
      throw new TypeError('channel must be an array of 256 numbers');
    }

    this.channelGammaTable[channel] = gammaTable;
  }

  output(values) {
    if (!Array.isArray(values) || gammaTable.length !== 18) {
      throw new TypeError('values must be an array of 18 numbers');
    }

    let buf = Buffer.from([...Array(18).keys()].map(i => channelGammaTable[i][values[i]]));
    this.i2c.writeBlockSync(this.i2cAddr, 0x01, buf.length, buf);

    buf = Buffer.from([0xFF]);
    this.i2c.writeBlockSync(this.i2cAddr, 0x16, buf.length, buf);
  }

  _i2cBusId() {
    let revision = fs.readFileSync('/proc/cpuinfo').toString().split("\n").filter(function(line) {
      return line.indexOf('Revision') === 0;
    })[0].split(":")[1].trim();
    return parseInt(revision, 16) >= 4 ? 1 : 0;
  }
}
