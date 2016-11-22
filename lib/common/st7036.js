import rpio from "rpio";
import {Spi} from "spi";

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
        this.rowOffsets = [[0x00], [0x00, 0x40], [0x00, 0x10, 0x20]][rows - 1];
        this.enabled = true;
        this.cursorEnabled = false;
        this.cursorBlink = false;
        this.doubleHeight = 0;
        this.animations = new Array(8).fill(null);

        this.spi = Spi('/dev/spidev0.' + spiChipSelect, {'maxSpeed': 1000000}, function(s){s.open();});

        if ( this.resetPin !== null ) {
            rpio.open(this.resetPin, rpio.OUTPUT, rpio.LOW);
            setTimeout(function() { rpio.write(this.resetPi, rpio.HIGH); }, 0.001);
        }

        rpio.open(this.registerSelectPin, rpio.OUTPUT, rpio.HIGH);

        this.updateDisplayMode();
    }

    function updateDisplayMode() {
      command = COMMAND_SET_DISPLAY_MODE
      command |= this.enabled ? DISPLAY_ON : 0
      command |= this.cursorEnabled ? CURSOR_ON : 0
      command |= this.cursorBlink ? BLINK_ON : 0
      
    }
}
