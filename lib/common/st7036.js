import rpio from "rpio";
import {Spi} from "spi";

class ST7036 {
    constructor(registerSelectPin, resetPin = null, rows = 3, columns = 16, spiChipSelect = 0, instructionSetTemplate = 0b00111000) {
        this.registerSelectPin = registerSelectPin;
        this.resetPin = resetPin;
        this.rows = rows;
        this.columns = columns;
        this.instructionSetTemplate = instructionSetTemplate;
        this.rowOffsets = [[0x00], [0x00, 0x40], [0x00, 0x10, 0x20]][rows - 1];

        this.spi = Spi('/dev/spidev0.' + spiChipSelect, {'maxSpeed': 1000000}, function(s){s.open();});

        if ( this.resetPin !== null ) {
            rpio.open(this.resetPin, rpio.OUTPUT, rpio.LOW);
            setTimeout(function() { rpio.write(this.resetPi, rpio.HIGH); }, 0.001);
        }

        rpio.open(this.registerSelectPin, rpio.OUTPUT, rpio.HIGH);
    }
}
