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
        extension: ['e'],
        kGrams: ['k']
    },
    default: {
        in: './data',
        cache: './cache',
        extension: 'txt',
        kGrams: 10,
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
    var kGrams = argv.kGrams;

    console.log("1. Using OANC data: " + dir + " (ext: " + JSON.stringify(extensions) + ")");

    // Step 2. Stats on sizes of files in question
    var fileInfo = gramAnalyzer.step2_analyzeFiles(cache, dir, extensions);
    console.log("2. File stats:     " + JSON.stringify(fileInfo.fileStats, null, 4));

    // Step 3. Stats on sentences size by word, and number of words in each file
    var sentenceInfo = gramAnalyzer.step3_analyzeSentencesAndWords(cache, fileInfo.files);
    console.log("3. Sentence stats: " + JSON.stringify(sentenceInfo.sentenceStats, null, 4));
    console.log("   Word stats:     " + JSON.stringify(sentenceInfo.wordStats, null, 4));

    // Step 4. Unigram/Bigram info, limited to Top-K (10 in assignment)
    var gramBasicInfo = gramAnalyzer.step4_analyzeGrams(cache, kGrams, fileInfo.files);
    console.log("4. N-Gram stats with no smoothing");
    console.log("   Unigram stats:  " + JSON.stringify(gramBasicInfo.unigrams, null, 4));
    console.log("   Bigram stats:   " + JSON.stringify(gramBasicInfo.bigrams, null, 4));

    // Step 5. Unigram/Bigram with Good-Turing smoothing
    var gramGoodTuringInfo = gramAnalyzer.step5_analyzeGramsGoodTuring(cache, kGrams, fileInfo.files);
    console.log("5. N-Gram stats with Good-Turing smoothing");
    console.log("   Unigram stats:  " + JSON.stringify(gramGoodTuringInfo.unigrams, null, 4));
    console.log("   Bigram stats:   " + JSON.stringify(gramGoodTuringInfo.bigrams, null, 4));

    // Step 6. Unigram/Bigram with "Better" smoothing (I chose Kneser-Ney)
    var gramKneserNeyInfo = gramAnalyzer.step6_analyzeGramsKneserNey(cache, kGrams, fileInfo.files);
    console.log("6. N-Gram stats with Kneser-Ney smoothing");
    console.log("   Unigram stats:  " + JSON.stringify(gramKneserNeyInfo.unigrams, null, 4));
    console.log("   Bigram stats:   " + JSON.stringify(gramKneserNeyInfo.bigrams, null, 4));


    process.exit(1);

}
