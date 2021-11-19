Command line utility to interface with Espruino board via tty. Created to serve as rudimentary emacs REPL for Espruino.

# major functionality

## plain terminal

very basic terminal bridging stdin/stdout to the board console. To be used for REPLing

## compile mode

when it detects certain control code, it switches mode:

* expects base64 encoded content (supports '\n' chunking) and decodes it
* passes the code through espruino's own "compiler" to add modules source. No tokenization or other features atm, but can be easily added
* resets the board & waits for restart
* sends the input content to the board with echo off. You won't get feedback unless there's error

you can run `onInit` or `save` or anything you want afterwards from the repl.

# why not use screen or esp tool?

screen lacks the support for compilation. Also, I could not reliably pipe content to it (on a Mac).

espruino's cli (npm) tools can compile, send and watch files but are significantly slower, plus echo it. Remember to switch off BLE when on latest Mac if you use them.

I wanted tool that can be customized and have special features for my rudimentary emacs espruino mode.
