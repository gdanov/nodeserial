const assert = require('assert');
const { StringDecoder } = require('string_decoder');
const buffStrDecoder = new StringDecoder('utf8');

const SerialPort = require('serialport');

const xesp = require('espruino');

const { hideBin } = require('yargs/helpers');
const yargs = require('yargs/yargs');
const argv = yargs(hideBin(process.argv)).alias('p', 'port').argv;

//console.log('>>>>>>', argv);
let tty_port = argv.port || argv._[0];
assert(tty_port, 'you must provide TTY port');
console.log('using TTY port ', tty_port);

xesp.init(() => {
  console.log('=== Espruino Tools initialized. ===');

  Espruino.Config.BLUETOOTH_LOW_ENERGY = false;
  Espruino.Config.BAUD_RATE = 115200;

  Espruino.Core.Serial.getPorts((ports) => {
    //    console.log('devices:', Espruino.Core.Serial.devices);
    //console.log('!!ports:', ports);
  });

  Espruino.Core.Serial.open(
    tty_port,
    (conncb) => {
      let parser = new SerialPort.parsers.Readline();
      parser.on('data', (str) => console.log('|', str));
      let prevReader = Espruino.Core.Serial.startListening((data) => {
        parser.write(new Uint8Array(data));
      });
    },
    (discb) => {}
  );
});

function atob(a) {
  return new Buffer.from(a, 'base64').toString('binary');
}

function btoa(b) {
  return new Buffer.from(b).toString('base64');
}

function showPortOpen() {
  console.log('port open. Data rate: ' + myPort.baudRate);
  console.log('-------------');
}

function showPortClose() {
  console.log('port closed.');
}

function showError(error) {
  console.log('Serial port error: ' + error);
}

process.stdin //
  .pipe(require('split')('\n', null, { maxLength: 999999 }))
  .on('data', processStdinLine);

// ESC[8m 	ESC[28m 	TTY set hidden/invisible mode
const hide_start = String.fromCharCode(...[27, 91, 56, 109]);
const hide_end = String.fromCharCode(...[27, 91, 50, 56, 109]);
let accumulating = false;
let accumulator = '';

function processStdinLine(line) {
  // we can have single-line code push so this is why code is structured this way
  if (line.startsWith(hide_start)) {
    accumulating = true;
    accumulator = '';
  }

  if (accumulating) {
    let todo = line;
    if (todo.startsWith(hide_start)) {
      todo = todo.substring(4);
    }
    if (todo.endsWith(hide_end)) {
      todo = todo.substring(0, todo.length - 5);
    }
    accumulator += atob(todo);
  } else {
    let handoff = false;
    let prevl = Espruino.Core.Serial.startListening((data) => {
      if (!handoff) {
        let dstr = Buffer.from(data).toString();
        let chunks = dstr.split('\n');
        if (chunks.length > 1) {
          handoff = true;
          Espruino.Core.Serial.startListening(prevl);
          // there's '>' without LF at the end which I can't always remove and I'm gonna live with it
          // remove cr+lf
          prevl(data.slice(chunks[0].length + 1));
        } // else skip, it's something long
      } else {
        // drain in case there's more buffered
        prevl(data);
      }
    });

    Espruino.Core.Serial.write(line + '\n', false, () => {});
  }

  if (line.endsWith(hide_end)) {
    accumulating = false;
    //console.log('>>>', accumulator, '<<<');

    Espruino.callProcessor('transformForEspruino', accumulator, function (code) {
      Espruino.Core.CodeWriter.writeToEspruino(code, function () {
        setTimeout(function () {
          //Espruino.Core.Serial.write('1+2\n', true, () => {});
        }, 500);
      });
    });
  }
}
