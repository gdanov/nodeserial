const SerialPort = require("serialport");
const xesp = require("xespruino");

const portName = "/dev/cu.usbserial-0001";
const portBaud = 115200;

const myPort = new SerialPort(portName, { baudRate: portBaud });

let parser = new SerialPort.parsers.Readline(); // make a new parser to read ASCII lines
myPort
	.pipe(parser)
//.pipe (new SerialPort.parsers.Ready ({delimiter: String.fromCharCode (...[ 27, 91, 63, 55, 108 ])}));

function showPortOpen() {
  console.log("port open. Data rate: " + myPort.baudRate);
  console.log("-------------");
}

function readSerialData(data) {
	//  console.log(data.charCodeAt (0), (new TextEncoder ()).encode (data), "|\n", data);
	console.log (data)

	if (data == String.fromCharCode (...[ 27, 91, 63, 55, 108, 13 ])){
		// better detect ready
		myPort.emit ("ready")
	}
	
  if (data.startsWith("|____|___|  _|_| |___|_|_|_|___|")) {
    // detect restarted
  }
}

function showPortClose() {
  console.log("port closed.");
}

function showError(error) {
  console.log("Serial port error: " + error);
}

myPort.on("open", showPortOpen);
parser.on("data", readSerialData);
myPort.on("close", showPortClose);
myPort.on("error", showError);

let onReady = null;

myPort.on ("ready",()=>{
	console.log ('READY?')
	if (onReady){
		onReady ();
		onReady = null;
	}
})

process.stdin
  .pipe(require("split")("\n", null, { maxLength: 999999 }))
  .on("data", processStdinLine);

// ESC[8m 	ESC[28m 	TTY set hidden/invisible mode
const hide_start = String.fromCharCode(...[27, 91, 56, 109]);
const hide_end = String.fromCharCode(...[27, 91, 50, 56, 109]);
let accumulating = false;
let accumulator = "";

const test = true;

function processStdinLine(line) {
  // we can have single-line code push so this is why code is structured this way
  if (line.startsWith(hide_start)) {
    accumulating = true;
    accumulator = "";
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
    myPort.write(line + "\n");
  }

  if (line.endsWith(hide_end)) {
    accumulating = false;
    //console.log(">>>", accumulator, "<<<");

		onReady = ()=>{
			xesp.transformCode(accumulator, function (code) {
				myPort.write (code.split ("\n")
											// you can use '\x10' literal but prettier craps it out replacing the quotes
											.map (line => String.fromCharCode (0x10) + line)
											.join ("\n"))
				myPort.drain();
				console.log ("###### ready ######")
			});	
		}
		
		myPort.write ("reset();\n");
  }
}
