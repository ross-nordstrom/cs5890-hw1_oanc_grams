/*global exports, process, require, exports */
"use strict";

var _ = require('underscore');

function printHelp(argv) {

    console.log("Usage: " + process.argv.slice(0, 2));
    console.log("\nOptions:");
    console.log("  --help (-h)                        - Print usage");
    console.log("  --verbose (-v)                     - Print debug messages");
    console.log("\n\nYour args: ", argv);
}

exports.printHelp = printHelp;
