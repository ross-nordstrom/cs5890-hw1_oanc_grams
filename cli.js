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
        cache: ['c'],
        extension: ['e']
    },
    default: {
        in: './data',
        cache: './cache',
        extension: 'txt',
        verbose: false
    }
};

var argv = require('minimist')(process.argv.slice(2), options);

if (argv.help) {

    cliHelper.printHelp(argv);
    process.exit(0);

} else {

    // Step 1.
    var dir = argv.in;
    var cache = argv.cache;
    var extensions = !argv.extension ? null : argv.extension.split(',').map(function prefixDot(s) {
        return '.' + s;
    });
    console.log("1. Using OANC data: " + dir + " (ext: " + JSON.stringify(extensions) + ")");

    // Step 2.
    var fileInfo = gramAnalyzer.analyzeFiles(cache, dir, extensions);
    console.log("2. File stats: " + JSON.stringify(fileInfo.fileStats, null, 4));

    // Step 3.
    var sentenceInfo = gramAnalyzer.analyzeSentencesAndWords(cache, fileInfo.files);
    console.log("3. Sentence stats: " + JSON.stringify(sentenceInfo.sentenceStats, null, 4));
    console.log("3. Word stats " + JSON.stringify(sentenceInfo.wordStats, null, 4));

    process.exit(1);

}
