/**
 * NGram analyzer module
 * @module GramAnalyzer
 * @description TODO
 */

/*global exports, process, require, exports */
"use strict";

var _ = require('underscore');
var fs = require('fs');

var cliHelper = require('./cliHelper');
var Natural = require('natural');
var tokenizer = new Natural.TreebankWordTokenizer(); //new Natural.WordTokenizer();
var nGrams = Natural.NGrams;

var GOOD_TURING_DECAY = 0.95

/******************************************************************************
 * Main functions
 ***/

/**
 * Analyze the files in a directory, producing some analysis on them:
 *
 * 1. Total number of documents (.txt files)
 * 2. Stats about the docs (min, mean, max size)
 *
 * @param dir
 * @param extensions
 * @return {{files: (*|string[]), fileStats: {min: null, mean: null, max: null, count: null}}}
 */
function step2_analyzeFiles(cacheDir, dir, extensions) {
    var cachePath = [cacheDir, 'step2_enumeratedFilepaths.json'].join('/');

    try {
        var cachedResult = fs.readFileSync(cachePath, 'utf8');
        if (cachedResult) return JSON.parse(cachedResult);
    } catch (e) {
        // Error very likely means the file doesn't exist, aka no Cache Entry
    }

    var files = cliHelper.listFlatFilesInDir(dir, extensions);

    // Filter down to whitelisted extensions
    var whitelistedFiles = files.filter(cliHelper.hasWhitelistedExtension.bind(null, extensions));

    // Produce stats about file sizes
    var fileSizes = whitelistedFiles.map(cliHelper.fileSize);
    var fileStats = stats(fileSizes);
    fileStats.units = "B/file";

    var result = {files: whitelistedFiles, fileStats: fileStats};

    // Cache the result for use next time
    fs.writeFileSync(cachePath, JSON.stringify(result, null, 4), 'utf8');

    return result;
}

/**
 * Analyze a set of files, calculating sentence/word stats
 * @param files
 * @return {{wordStats: {total: *, uniq}, sentenceStats: *}}
 */
function step3_analyzeSentencesAndWords(cacheDir, files) {
    var cachePath = [cacheDir, 'step3_sentenceAndWordStats.json'].join('/');

    try {
        var cachedResult = fs.readFileSync(cachePath, 'utf8');
        if (cachedResult) return JSON.parse(cachedResult);
    } catch (e) {
        // Error very likely means the file doesn't exist, aka no Cache Entry
    }

    // For each file, calculate it's sentence/word/nGram stats and aggregate them as a stream
    var sentenceStats = aggregateSentenceStats(files);

    var wordStats = {
        total: sentenceStats.totalWords,
        meanWords: Math.round(sentenceStats.meanWords * 100) / 100,
        meanUniqWords: Math.round(sentenceStats.meanUniqWords * 100) / 100,
        files: sentenceStats.files
    };
    delete sentenceStats.totalWords;
    delete sentenceStats.meanWords;
    delete sentenceStats.meanUniqWords;

    sentenceStats.units = "words/sentence";
    var result = {wordStats: wordStats, sentenceStats: sentenceStats};

    // Cache the result for use next time
    fs.writeFileSync(cachePath, JSON.stringify(result, null, 4), 'utf8');

    return result;
}

/**
 * Analyze a set of files, parsing out and collecting uni/bigram stats
 * @param cacheDir
 * @param {number} kGrams       - How many uni/bigrams should we keep (aka Top K, such as 10)
 * @param files
 * @return {{unigramStats: {total: *, uniq}, bigramStats: *}}
 */
function step4_analyzeGrams(cacheDir, kGrams, files) {
    kGrams = kGrams < 0 ? 0 : kGrams;
    var kGramsSuffix = kGrams ? ('.' + kGrams) : '';
    var cachePath = [cacheDir, 'step4_analyzeGrams' + kGramsSuffix + '.json'].join('/');

    try {
        var cachedResult = fs.readFileSync(cachePath, 'utf8');
        if (cachedResult) return JSON.parse(cachedResult);
    } catch (e) {
        // Error very likely means the file doesn't exist, aka no Cache Entry
    }

    // For each file, calculate it's sentence/word/nGram stats and aggregate them as a stream
    var gramFiles = produceGramFiles(files);
    var filesByGramType = transpose(gramFiles);
    var unigramFiles = filesByGramType[0];
    var bigramFiles = filesByGramType[1];
    gramFiles = null; // Help cleanup memory

    // Calculate overall unigram stats
    var topIntermediateCounts = topKWordCounts.bind(null, kGrams * 10);
    var topCounts = topKWordCounts.bind(null, kGrams);
    var unigrams = unigramFiles.reduce(function aggregateUnigrams(unigramCounts, nextUnigramFile) {
        var nextUnigramCounts = JSON.parse(cliHelper.fileContent(nextUnigramFile));
        var topNextUnigramCounts = topIntermediateCounts(nextUnigramCounts);
        return aggregateWordCounts(unigramCounts, topNextUnigramCounts);
    }, {});
    var topUnigrams = topCounts(unigrams);

    var bigrams = bigramFiles.reduce(function aggregateBigrams(bigramCounts, nextBigramFile) {
        var nextBigramCounts = JSON.parse(cliHelper.fileContent(nextBigramFile));
        var topNextBigramCounts = topIntermediateCounts(nextBigramCounts);
        return aggregateWordCounts(bigramCounts, topNextBigramCounts);
    }, {});
    var topBigrams = topCounts(bigrams);

    var result = {unigrams: topUnigrams, bigrams: topBigrams, k: kGrams};

    // Cache the result for use next time
    fs.writeFileSync(cachePath, JSON.stringify(result, null, 4), 'utf8');

    return result;
}

function step5_analyzeGramsGoodTuring(cacheDir, kGrams, files) {
    kGrams = kGrams < 0 ? 0 : kGrams;
    var kGramsSuffix = kGrams ? ('.' + kGrams) : '';
    var cachePath = [cacheDir, 'step5_analyzeGramsGoodTuring' + kGramsSuffix + '.json'].join('/');

    try {
        var cachedResult = fs.readFileSync(cachePath, 'utf8');
        if (cachedResult) return JSON.parse(cachedResult);
    } catch (e) {
        // Error very likely means the file doesn't exist, aka no Cache Entry
    }

    // Get ALL uni/bigram counts so we can base off of those. Hopefully they're already cached...
    var allGrams = step4_analyzeGrams(cacheDir, 0, files);

    var freqOfFreqUnigrams = _.countBy(allGrams.unigrams);
    var freqOfFreqBigrams = _.countBy(allGrams.bigrams);

    // Calculate overall Good-Turing uni/bigram stats
    var topIntermediateCounts = topKWordCounts.bind(null, kGrams * 10);
    var topCounts = topKWordCounts.bind(null, kGrams);

    var unigrams = _.reduce(allGrams.unigrams, function aggregateUnigrams(goodTuringUnigramCounts, count, word) {
        var denominator = freqOfFreqUnigrams[count];
        var numerator = freqOfFreqUnigrams[count + 1] || (GOOD_TURING_DECAY * denominator); // If no N_(c+1) freq, just default
        var goodTuringCount = (count + 1) * numerator / denominator;

        goodTuringUnigramCounts[word] = Math.round(goodTuringCount * 100) / 100;

        return topIntermediateCounts(goodTuringUnigramCounts);
    }, {});
    var topUnigrams = topCounts(unigrams);

    var bigrams = _.reduce(allGrams.bigrams, function aggregateBigrams(goodTuringBigramCounts, count, word) {
        var denominator = freqOfFreqBigrams[count];
        var numerator = freqOfFreqBigrams[count + 1] || (GOOD_TURING_DECAY * denominator); // If no N_(c+1) freq, just default
        var goodTuringCount = (count + 1) * numerator / denominator;

        goodTuringBigramCounts[word] = Math.round(goodTuringCount * 100) / 100;

        return topIntermediateCounts(goodTuringBigramCounts);
    }, {});
    var topBigrams = topCounts(bigrams);

    var result = {unigrams: topUnigrams, bigrams: topBigrams, k: kGrams};

    // Cache the result for use next time
    fs.writeFileSync(cachePath, JSON.stringify(result, null, 4), 'utf8');

    return result;
}


function step6_analyzeGramsKneserNey(cacheDir, kGrams, files) {
    kGrams = kGrams < 0 ? 0 : kGrams;
    var kGramsSuffix = kGrams ? ('.' + kGrams) : '';
    var cachePath = [cacheDir, 'step6_analyzeGramsKneserNey' + kGramsSuffix + '.json'].join('/');

    try {
        var cachedResult = fs.readFileSync(cachePath, 'utf8');
        if (cachedResult) return JSON.parse(cachedResult);
    } catch (e) {
        // Error very likely means the file doesn't exist, aka no Cache Entry
    }

    // Get ALL uni/bigram counts so we can base off of those. Hopefully they're already cached...
    var allGrams = step4_analyzeGrams(cacheDir, 0, files);

    // The Kneser-Ney smooth bigram model:
    //      δ refers to a fixed discount value
    //      λ is a normalizing constant
    //
    // P(w_i | w_(i-1) ) =    [ max( c(w_(i-1) * w_i) - δ,  0) / c( w_(i-1) ) ]
    //                      + [ λ *   |{wi−1:c(wi−1,wi)>0}|   /                 // This is the # bigram types w_i completes
    //                                |{wj−1:c(wj−1,wj)>0}|  ]                  // This is the # of bigram types
    //
    // λ( w_(i-1) ) =   [ δ / c( w_(i-1) ) ]
    //                * |{w′:c(wi−1,w′)>0}|     // This is the # of bigram types starting with w_(i-1)

    // Calculate overall Good-Turing bigram stats (doesn't deal with unigrams)
    var δ = 0.5;    // Discount value should be between 0-1
    var totalBigramTypes = _.size(allGrams.bigrams);

    var bigramKeys = _.keys(allGrams.bigrams);
    var parsedBigrams = _.map(bigramKeys, parseBigramKey);
    bigramKeys = null; // Help cleanup memory
    var bigramStarts = bigramCountStarts(parsedBigrams)/*(word)*/;
    var bigramEnds = bigramCountEnds(parsedBigrams)/*(word)*/;
    var calcλ = function (firstWord) {
        var count = unigramCount(allGrams.unigrams, firstWord);
        return (δ / count) * bigramStarts(firstWord);
    };
    var P_kn = function (secondWord, /*given*/ firstWord) {
        var bigramCount = allGrams.bigrams[[firstWord, secondWord]];
        var firstWordCount = unigramCount(allGrams.unigrams, firstWord);
        var λ = calcλ(firstWord);
        var secondWordBigramPrevalence = bigramEnds(secondWord);

        return ( Math.max(bigramCount - δ, 0) / firstWordCount )
            + λ * (secondWordBigramPrevalence / totalBigramTypes);
    };

    var topCounts = topKWordCounts.bind(null, kGrams);
    var bigrams = _.reduce(parsedBigrams, function aggregateBigrams(kneserNeyCounts, bigram, dbgIdx) {
        var firstWord = _.first(bigram);
        var secondWord = _.last(bigram);

        kneserNeyCounts[bigram] = P_kn(secondWord, firstWord);
        return kneserNeyCounts;
    }, {});
    var topBigrams = topCounts(bigrams);

    var result = {bigrams: topBigrams, k: kGrams};

    // Cache the result for use next time
    fs.writeFileSync(cachePath, JSON.stringify(result, null, 4), 'utf8');

    return result;
}

/******************************************************************************
 * Internal functions
 ***/

function unigramCount(unigrams, word) {
    return unigrams[word] || 0;
}

function bigramCountStarts(bigrams) {
    var bigramStarts = _.countBy(bigrams, function countStarts(bigramKey) {
        return _.first(bigramKey);
    });

    return function (word) {
        return bigramStarts[word];
    };
}
function bigramCountEnds(bigrams) {
    var bigramEnds = _.countBy(bigrams, function countStarts(bigramKey) {
        return _.last(bigramKey);
    });

    return function (word) {
        return bigramEnds[word];
    };
}

function parseBigramKey(key) {
    var bigrams = key.split(',');
    var n = _.size(bigrams);
    if (n === 2) return bigrams;

    // It contained 1 or more ','s
    if (n === 4) return [',', ','];

    if (_.isEmpty(_.first(bigrams))) return [',', _.last(bigrams)];
    return [_.first(bigrams), ','];
}

/**
 * Given a list of numbers, produce a set of stats about it, including min/mean/max
 * @param {number[]} nums
 * @returns {{min: null, mean: null, max: null, count: null}}
 */
function stats(nums) {
    var stats = {min: null, mean: null, max: null, count: null};

    if (_.isArray(nums) && !_.isEmpty(nums)) {
        var sorted = _.sortBy(nums);

        stats.min = _.first(sorted);
        stats.max = _.last(sorted);
        stats.count = nums.length;
        stats.median = sorted[Math.round(nums.length / 2)];

        var mean = stats.count <= 0 ? Infinity : Math.round(100 * sum(nums) / stats.count) / 100;
        stats.mean = Math.round(mean * 100) / 100;

    }

    return stats;
}

/**
 * For a given file content blob, parse out the sentences as a list
 * @param {string} text
 * @returns {string[]} The sentences, excluding punctuation
 */
function parseSentences(text) {

    // Sentences are separated by 2 newlines
    // Split the text on newlines,
    //      then trim the resulting strings of excess whitespace
    //      and finally filter out empty lines,
    //      leaving just the sentences
    return _.reject(text.split('\n').map(_.partial(_.trim, _, ' ')), _.isEmpty)
}

/**
 * Get the number of words in a sentence
 * @param {string} sentence
 * @returns {string[]} Words in the sentence
 */
function parseWordsInSentence(sentence) {
    return tokenizer.tokenize(_.trim(sentence));
}

/**
 * For a given file, produce sentence stats, along with some info about uniq words and uni/bi grams
 * @param file
 * @return {{min: null, mean: null, max: null, count: null}}
 */
function statsForFile(file, dbgIdx) {
    var fileContent = cliHelper.fileContent(file);
    var sentences = parseSentences(fileContent);
    fileContent = null; // Help cleanup memory

    var wordsInSentences = sentences.map(parseWordsInSentence);
    var wordCountInSentences = _.map(wordsInSentences, _.size);
    var sentenceStats = stats(wordCountInSentences);

    sentenceStats.totalSentences = sentences.length;
    sentences = null; // Help cleanup memory

    sentenceStats.words = sum(wordCountInSentences);
    sentenceStats.uniqWords = _.size(_.uniq(_.flatten(wordsInSentences)));
    wordsInSentences = null; // Help cleanup memory

    return sentenceStats;
}

function produceGramFiles(files) {
    var gramFiles = _.shuffle(files).map(produceGramFileFromTextFile);
    return gramFiles;
}

function produceGramFileFromTextFile(file, dbgFileIdx) {
    // Remove file extension from filename
    var baseFilename = file.split('.').slice(0, -1).join('.');
    var unigramPath = [baseFilename, 'unigrams'].join('.');
    var bigramPath = [baseFilename, 'bigrams'].join('.');

    // First check if the files have been produced
    try {
        var unigramResult = fs.readFileSync(unigramPath, 'utf8');
        var bigramResult = fs.readFileSync(bigramPath, 'utf8');
        if (unigramResult && bigramResult) return [unigramPath, bigramPath];
    } catch (e) {
        // Error very likely means the file(s) don't exist, aka no Cache Entry
    }

    // Gram files not produced yet. Get the file's content and produce it.
    var fileContent = cliHelper.fileContent(file);
    var sentences = parseSentences(fileContent);
    fileContent = null; // Help cleanup memory

    var wordsInSentences = _.reject(sentences.map(parseWordsInSentence), _.isEmpty);
    sentences = null; // Help cleanup memory

    if (!unigramResult) {
        // To conserve memory, calculate nGram counts AND aggregate as a single stream
        var unigramCounts = wordsInSentences.reduce(function streamUnigrams(unigramCounts, wordsInThisSentence, dbgIdx) {
            var unigramCountsInThisSentence = _.countBy(wordsInThisSentence);
            return aggregateWordCounts(unigramCounts, unigramCountsInThisSentence);
        }, {});
        // Cache the results for use next time
        fs.writeFileSync(unigramPath, JSON.stringify(unigramCounts, null, 4), 'utf8');
        unigramCounts = null; // Help cleanup memory
    }

    if (!bigramResult) {
        var bigramCounts = wordsInSentences.reduce(function streamBigrams(bigramCounts, wordsInThisSentence, dbgIdx) {
            // CountBy will automatically serialize the bigram tuples (E.g. `['a','b']` becomes `"a,b"`)
            var bigramCountsInThisSentence = _.countBy(nGrams.bigrams(wordsInThisSentence));
            return aggregateWordCounts(bigramCounts, bigramCountsInThisSentence);
        }, {});
        // Cache the results for use next time
        fs.writeFileSync(bigramPath, JSON.stringify(bigramCounts, null, 4), 'utf8');
        bigramCounts = null; // Help cleanup memory
    }

    wordsInSentences = null; // Help cleanup memory
    return [unigramPath, bigramPath];
}

/**
 * Given some sentences, combine them into a single set of stats, and uniq word uni/bi gram info
 * @param {Object[]} files
 * @return {{min: number, mean: number, max: number, count: *, totalSentences: *, totalWords: *, uniqWords}}
 */
function aggregateSentenceStats(files) {
    var baseStats = {
        min: Infinity,
        mean: null,
        max: -Infinity,
        count: 0,
        totalSentences: 0,
        totalWords: 0,
        files: 0,
        meanWords: 0,
        meanUniqWords: 0
    };

    // Process the files as a "stream", meaning we will calculate stats for each file
    // and then immediately aggregate it into a single overall stat
    // to reduce the amount of memory used.
    return _.reduce(files, function calculateAndAggregateStats(accStats, file, idx) {
        var fileStats = statsForFile(file);
        return combineSentenceStats(accStats, fileStats);
    }, baseStats);

}

/**
 * Combine two sentence stat objects
 * @param accStats
 * @param nextStats
 * @return {{min: number, mean: number, max: number, count: *, totalSentences: *, totalWords: *, uniqWords, unigrams: *, bigrams: *}}
 */
function combineSentenceStats(accStats, nextStats) {
    var count = accStats.count + nextStats.count;
    var mean = ((accStats.mean * accStats.count) + (nextStats.mean * nextStats.count)) / count;
    var files = accStats.files + 1;

    var sentenceStats = {
        min: Math.min(accStats.min, nextStats.min),
        mean: Math.round(mean * 100) / 100,
        max: Math.max(accStats.max, nextStats.max),
        count: count,
        files: files,
        totalSentences: accStats.totalSentences + nextStats.totalSentences,
        totalWords: accStats.totalWords + nextStats.words,
        meanWords: (accStats.meanWords * accStats.files + nextStats.words) / files,
        meanUniqWords: (accStats.meanUniqWords * accStats.files + nextStats.uniqWords) / files
    };
    return sentenceStats;
}

/**
 * Add a new (smaller) word count to a base count.
 *
 * **WARNING:** Alters the `baseCount` arg
 *
 * @param {Object} baseCount
 * @param {Object} nextCount
 * @return {*}
 */
function aggregateWordCounts(baseCount, nextCount) {
    _.each(nextCount, function addCounts(count, word) {
        baseCount[word] = (baseCount[word] || 0) + count;
    });

    return baseCount;
}

function topKWordCounts(k, wordCounts) {
    if (_.size(_.keys(wordCounts)) <= k) return wordCounts;

    var tuples = _.sortBy(_.pairs(wordCounts), 1);
    var topTuples = !k ? tuples : tuples.slice(-k);
    return _.object(topTuples);
}

function sum(nums) {
    return nums.reduce(add, 0);
}

function add(a, b) {
    return a + b;
}

/**
 * Transposes a 2D array (marix)
 * @param table
 * @return {*}
 */
function transpose(table) {
    try {
        return table[0].map(function (_, c) {
            return table.map(function (r) {
                return r[c];
            });
        });
    } catch (e) {
        return table; // Table was a bad input. Let the caller deal with it
    }
}

/******************************************************************************
 * Expose functions
 ***/
exports.step2_analyzeFiles = step2_analyzeFiles;
exports.step3_analyzeSentencesAndWords = step3_analyzeSentencesAndWords;
exports.step4_analyzeGrams = step4_analyzeGrams;
exports.step5_analyzeGramsGoodTuring = step5_analyzeGramsGoodTuring;
exports.step6_analyzeGramsKneserNey = step6_analyzeGramsKneserNey;
