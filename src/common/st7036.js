import rpio from 'rpio';
import spiDevice from 'spi-device';
import dbg from 'debug';

const debug = dbg('dot:common:st7036');

export default class ST7036 {
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

    this.spi = spiDevice.openSync(0, spiChipSelect, {maxSpeedHz: 1000000});

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
    this._writeCommand(0b00010100 | (bias << 4) | 1, 1);
  }

  setContrast(contrast) {
    if (typeof(contrast) !== 'number') {
      throw new TypeError('contrast must be a number');
    }

    if (contrast < 0 || contrast > 0x3F) {
      throw new RangeError('contrast must be an integer in the range 0..0x3F');
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
    let command = 0b00001000;
    command |= this.enabled ? 0b00000100 : 0;
    command |= this.cursorEnabled ? 0b00000010 : 0;
    command |= this.cursorBlink ? 0b00000001 : 0;
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
      throw new RangeError('row and column must integers within the defined screen size');
    }

    let offset = this.rowOffsets[row] + column;
    this._writeCommand(0b10000000 | offset);
    rpio.usleep(1.5);
  }

  home() {
    this.setCursorPosition(0, 0);
  }

  clear() {
    this._writeCommand(0b00000001);
    rpio.usleep(1.5)
    this.home();
  }

  write(value) {
    rpio.write(this.registerSelectPin, rpio.HIGH);
    [...value].forEach((chr) => {
      let buf = Buffer.from([chr.charCodeAt()]);
      this.spi.transferSync([
        {
          byteLength: buf.length,
          sendBuffer: buf
        }
      ]);
      rpio.usleep(0.05);
    });
  }

  createAnimation(animPos, animMap, frameRate) {
    if (animPos < 0 || animPos >= this.animations.length) {
      throw new RangeError('Valid animation positions are 0 to ' + (this.animations.length - 1).toString());
    }

    if (!Array.isArray(animMap)) {
      throw new TypeError('Animation map should be a list of animation frames');
    }

    if (!Array.isArray(animMap[0])) {
      throw new TypeError('Animation frames should be lists of 8 bytes');
    }

    if (animMap[0].length < 8) {
      throw new RangeError('Animation frames should be lists of 8 bytes');
    }

    this.createChar(animPos, animMap[0]);
    this.animations[animPos] = [animMap, frameRate];
    this.setCursorPosition(0, 1);
  }

  updateAnimations() {
    this.animations.forEach((animation, i) => {
      if (animation !== null && animation.length === 2) {
        let anim = animation[0];
        let fps = animation[1];
        let frame = anim[Math.trunc(Math.round(Date.now() / 1000 * fps) % anim.length)]
        this.createChar(i, frame);
      }
    });
    this.setCursorPosition(0, 1);
  }

  createChar(charPos, charMap) {
    if (charPos < 0 || charPos > 7) {
      return false;
    }

    let baseAddress = charPos * 8;
    for (let i = 0; i < 8; i++) {
      this._writeCommand(0x40 | (baseAddress + i));
      this._writeChar(charMap[i]);
    }

    this.setDisplayMode();
  }

  cursorLeft() {
    this._writeCommand(0b00010000);
  }

  cursorRight() {
    this._writeCommand(0b00010000 | (1 << 2));
  }

  shiftLeft() {
    this._writeCommand(0b00010000 | (1 << 3));
  }

  shiftRight() {
    this._writeCommand(0b00010000 | (1 << 3) | (1 << 2));
  }

  doubleHeight(enable = 0, position = 1) {
    this.doubleHeight = enable;
    this._writeInstructionSet(0);
    this._writeCommand(0b00010000 | (position << 3), 2);
  }

  _writeChar(value) {
    rpio.write(this.registerSelectPin, rpio.HIGH);
    let buf = Buffer.from([value]);
    this.spi.transferSync([
      {
        byteLength: buf.length,
        sendBuffer: buf
      }
    ]);
    rpio.usleep(0.1);
  }

  _writeInstructionSet(instructionSet = 0) {
    rpio.write(this.registerSelectPin, rpio.LOW);
    let buf = Buffer.from([this.instructionSetTemplate | instructionSet | (this.doubleHeight << 2)]);
    this.spi.transferSync([
      {
        byteLength: buf.length,
        sendBuffer: buf
      }
    ]);
    rpio.usleep(0.06);
  }

  _writeCommand(value, instructionSet = 0) {
    rpio.write(this.registerSelectPin, rpio.LOW);
    this._writeInstructionSet(instructionSet);
    let buf = Buffer.from([value]);
    this.spi.transferSync([
      {
        byteLength: buf.length,
        sendBuffer: buf
      }
    ]);
    rpio.usleep(0.06);
  }
}
