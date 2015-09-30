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
        out: ['o'],
        in: ['i'],
        extension: ['e']
    },
    default: {
        out: './data',
        in: './data',
        extension: 'txt',
        verbose: false
    }
};

var argv = require('minimist')(process.argv.slice(2), options);

if (argv.help) {

    cliHelper.printHelp(argv);
    process.exit(0);

} else {

    var dir = argv.in;
    var extensions = !argv.extension ? null : argv.extension.split(',').map(function prefixDot(s) {
        return '.' + s;
    });

    var files = cliHelper.listFlatFilesInDir(dir, extensions);

    console.log("Check against extensions: ", extensions);
    var whitelistedFiles = files.filter(cliHelper.hasWhitelistedExtension.bind(null, extensions));
    var fileStats = gramAnalyzer.stats(whitelistedFiles.map(cliHelper.fileSize));
    console.log("1. File stats: \n", fileStats);

    //var sentenceStats;
    //var sampleFile = cliHelper.fileContent(_.first(files));
    //var sampleSentences = gramAnalyzer.sentences(sampleFile);
    //console.log("2. Sentence stats: \n", _.first(sampleSentences));

    process.exit(1);

}
