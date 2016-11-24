import rpio from "rpio";
import SPI from "spi-device";
import dbg from "debug";

const debug = dbg('dot:st7036');

export const COMMAND_CLEAR = 0b00000001
export const COMMAND_HOME = 0b00000010
export const COMMAND_SCROLL = 0b00010000
export const COMMAND_DOUBLE = 0b00010000
export const COMMAND_BIAS = 0b00010100
export const COMMAND_SET_DISPLAY_MODE = 0b00001000

export const BLINK_ON = 0b00000001
export const CURSOR_ON = 0b00000010
export const DISPLAY_ON = 0b00000100

export class ST7036 {
  constructor(registerSelectPin, resetPin = null, rows = 3, columns = 16, spiChipSelect = 0, instructionSetTemplate = 0b00111000) {
    this.registerSelectPin = registerSelectPin;
    this.resetPin = resetPin;
    this.rows = rows;
    this.columns = columns;
    this.instructionSetTemplate = instructionSetTemplate;
    this.rowOffsets = [
      [0x00],
      [0x00, 0x40],
      [0x00, 0x10, 0x20]
    ][rows - 1];
    this.enabled = true;
    this.cursorEnabled = false;
    this.cursorBlink = false;
    this.doubleHeight = 0;
    this.animations = new Array(8).fill(null);

    this.spi = SPI.openSync(0, spiChipSelect, {maxSpeedHz: 1000000});

    if (this.resetPin !== null) {
      rpio.open(this.resetPin, rpio.OUTPUT, rpio.LOW);
      rpio.usleep(1);
      rpio.write(this.resetPin, rpio.HIGH);
    }

    rpio.open(this.registerSelectPin, rpio.OUTPUT, rpio.HIGH);

    this.updateDisplayMode();
    this._writeCommand(0b00000100 | 0b00000010);
    this.setBias(1);
    this.setContrast(40);
    this.clear();
  }

  setBias(bias = 1) {
    this._writeCommand(COMMAND_BIAS | (bias << 4) | 1, 1);
  }

  setContrast(contrast) {
    if (typeof(contrast) !== "number") {
      throw new TypeError("contrast must be a number");
    }

    if (contrast < 0 || contrast > 0x3F) {
      throw new RangeError("contrast must be an integer in the range 0..0x3F");
    }

    this._writeCommand((0b01010100 | ((contrast >> 4) & 0x03)), 1);
    this._writeCommand(0b01101011, 1);
    this._writeCommand((0b01110000 | (contrast & 0x0F)), 1);
  }

  setDisplayMode(enable = true, cursor = false, blink = false) {
    this.enabled = enable;
    this.cursorEnabled = cursor;
    this.cursorBlink = blink;
    this.updateDisplayMode();
  }

  updateDisplayMode() {
    let command = COMMAND_SET_DISPLAY_MODE;
    command |= this.enabled
      ? DISPLAY_ON
      : 0;
    command |= this.cursorEnabled
      ? CURSOR_ON
      : 0;
    command |= this.cursorBlink
      ? BLINK_ON
      : 0;
    this._writeCommand(command);
  }

  enableCursor(cursor = false) {
    this.cursorEnabled = cursor;
    this.updateDisplayMode();
  }

  enableBlink(blink = false) {
    this.cursorBlink = blink;
    this.updateDisplayMode();
  }

  setCursorOffset(offset) {
    this._writeCommand(0b10000000 | offset);
  }

  setCursorPosition(column, row) {
    if (column < 0 || column > this.columns || row < 0 || row > this.rows) {
      throw new RangeError("row and column must integers within the defined screen size");
    }

    let offset = this.rowOffsets[row] + column;
    this._writeCommand(0b10000000 | offset);
    rpio.usleep(1.5);
  }

  home() {
    this.setCursorPosition(0, 0);
  }

  clear() {
    this._writeCommand(COMMAND_CLEAR);
    rpio.usleep(1.5)
    this.home();
  }

  write(value) {
    rpio.write(this.registerSelectPin, rpio.HIGH);
    [...value].forEach((chr) => {
      let buf = Buffer.from([chr.charCodeAt()]);
      this.spi.transferSync([{
	byteLength: buf.length,
        sendBuffer: buf
      }]);
      rpio.usleep(0.05);
    });
  }

  createAnimation(animPos, animMap, frameRate) {

  }

  updateAnimations() {

  }

  createChar(charPos, charMap) {

  }

  cursorLeft() {

  }

  cursorRight() {

  }

  shiftLeft() {

  }

  shiftRight() {

  }

  doubleHeight(enable = 0, position = 1) {

  }

  _writeChar(value) {

  }

  _writeInstructionSet(instructionSet = 0) {
    rpio.write(this.registerSelectPin, rpio.LOW);
    let buf = Buffer.from([this.instructionSetTemplate | instructionSet | (this.doubleHeight << 2)]);
    this.spi.transferSync([{
      byteLength: buf.length,
      sendBuffer: buf
    }]);
    rpio.usleep(0.06);
  }

  _writeCommand(value, instructionSet = 0) {
    rpio.write(this.registerSelectPin, rpio.LOW);
    this._writeInstructionSet(instructionSet);
    let buf = Buffer.from([value]);
	  debug(buf);
    this.spi.transferSync([{
      byteLength: buf.length,
      sendBuffer: buf
    }]);
    rpio.usleep(0.06);
  }
}
