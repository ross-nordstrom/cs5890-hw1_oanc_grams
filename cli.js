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

    var whitelistedFiles = files.filter(cliHelper.hasWhitelistedExtension.bind(null, extensions));
    var fileStats = gramAnalyzer.stats(whitelistedFiles.map(cliHelper.fileSize));
    console.log("1. File stats: \n", fileStats);

    var allSentenceStats = whitelistedFiles.map(function statsForFile(whitelistedFile) {
        var fileContent = cliHelper.fileContent(whitelistedFile);
        var sentences = gramAnalyzer.sentences(fileContent);
        var sentenceStats = gramAnalyzer.stats(sentences.map(gramAnalyzer.wordsInSentence));
        sentenceStats.totalSentences = sentences.length;

        return sentenceStats;
    });
    //  Aggregate all the stats into a single stat
    var overallSentenceStats = _.reduce(allSentenceStats, function aggregateSentenceStats(a, b) {
        var count = a.count + b.count;
        return {
            min: Math.min(a.min, b.min),
            mean: ((a.mean * a.count) + (b.mean * b.count)) / count,
            max: Math.max(a.max, b.max),
            count: count,
            totalSentences: a.totalSentences + b.totalSentences
        };
    }, {min: Infinity, mean: null, max: -Infinity, count: 0, totalSentences: 0});
    console.log("2. Sentence stats: \n", _.omit(overallSentenceStats, 'median'));

    process.exit(1);

}
