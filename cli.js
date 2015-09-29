#! /usr/bin/env node

var request = require('superagent');
var async = require('async');
var _ = require('underscore');
var fs = require('fs');
var gramAnalyzer = require('./lib/gramAnalyzer');
var cliHelper = require('./lib/cliHelper');
var natural = require('natural');

var options = {
    boolean: [
        'help',
        'verbose'
    ],
    alias: {
        help: ['h'],
        verbose: ['v'],
        in: ['i'],
        out: ['o']
    },
    default: {
        out: './data',
        in: './data',
        verbose: false
    }
};

var argv = require('minimist')(process.argv.slice(2), options);

if (argv.help) {

    cliHelper.printHelp(argv);
    process.exit(0);

} else {

    var dir = argv.in;

    var files = cliHelper.listFlatFilesInDir(dir);
    var fileStats = gramAnalyzer.stats(files.map(cliHelper.fileSize));
    console.log("1. File stats: ", fileStats);

    process.exit(1);

}
