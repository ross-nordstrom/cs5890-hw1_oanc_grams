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
function analyzeFiles(cacheDir, dir, extensions) {
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
 * Analyze a set of files, parsing out bi/unigram info and collecting sentence/word stats
 * @param files
 * @return {{unigrams: string[], bigrams: string[], wordStats: {total: *, uniq}, sentenceStats: *}}
 */
function analyzeSentencesAndWords(cacheDir, files) {
    var cachePath = [cacheDir, 'step3_1_sentenceAndWordInfo.json'].join('/');

    try {
        var cachedResult = fs.readFileSync(cachePath, 'utf8');
        if (cachedResult) return JSON.parse(cachedResult);
    } catch (e) {
        // Error very likely means the file doesn't exist, aka no Cache Entry
    }

    // Calculate sentence stats for each file
    var sentenceStatsByFile = statsForFiles(cacheDir, files);

    // Aggregate all those per-file sentence stats into a single stat
    var sentenceStats = aggregateSentenceStats(sentenceStatsByFile);

    var wordStats = {
        total: sentenceStats.totalWords,
        uniq: _.size(sentenceStats.uniqWords)
    };


    var result = {unigrams: ['foo'], bigrams: ['bar'], wordStats: wordStats, sentenceStats: sentenceStats};

    // Cache the result for use next time
    fs.writeFileSync(cachePath, JSON.stringify(result, null, 4), 'utf8');

    return result;
}

/******************************************************************************
 * Internal functions
 ***/

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

        var sum = nums.reduce(function add(a, b) {
            return a + b
        }, 0);
        stats.mean = stats.count <= 0 ? Infinity : Math.round(100 * sum / stats.count) / 100;

    }

    return stats;
}

function statsForFiles(cacheDir, files) {
    var cachePath = [cacheDir, 'step3_2_statsForFiles.json'].join('/');

    try {
        var cachedResult = fs.readFileSync(cachePath, 'utf8');
        if (cachedResult) return JSON.parse(cachedResult);
    } catch (e) {
        // Error very likely means the file doesn't exist, aka no Cache Entry
    }

    var filesStats = files.map(statsForFile);

    // Cache the result for use next time
    fs.writeFileSync(cachePath, JSON.stringify(filesStats, null, 4), 'utf8');

    return filesStats;

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
    return tokenizer.tokenize(sentence);
}

/**
 * For a given file, produce sentence stats, along with some info about uniq words and uni/bi grams
 * @param file
 * @return {{min: null, mean: null, max: null, count: null}}
 */
function statsForFile(file) {
    var fileContent = cliHelper.fileContent(file);
    var sentences = parseSentences(fileContent);

    var wordsInSentences = sentences.map(parseWordsInSentence);
    var wordCountInSentences = _.map(wordsInSentences, _.size);
    var sentenceStats = stats(wordCountInSentences);

    sentenceStats.totalSentences = sentences.length;
    sentenceStats.totalWords = _.size(wordsInSentences);
    sentenceStats.uniqWords = _.uniq.apply(null, _.flatten(wordsInSentences));

    sentenceStats.unigrams = unigramCounts(wordsInSentences);
    sentenceStats.bigrams = bigramCounts(wordsInSentences);

    return sentenceStats;
}

/**
 * Given some sentences, combine them into a single set of stats, and uniq word uni/bi gram info
 * @param {Object[]} sentenceStatsByFile
 * @return {{min: number, mean: number, max: number, count: *, totalSentences: *, totalWords: *, uniqWords}}
 */
function aggregateSentenceStats(sentenceStatsByFile) {
    var base = {
        min: Infinity,
        mean: null,
        max: -Infinity,
        count: 0,
        totalSentences: 0,
        totalWords: 0,
        uniqWords: []
    };

    return _.reduce(sentenceStatsByFile, function combineSentenceStats(a, b) {
        var count = a.count + b.count;
        var sentenceStats = {
            min: Math.min(a.min, b.min),
            mean: ((a.mean * a.count) + (b.mean * b.count)) / count,
            max: Math.max(a.max, b.max),
            count: count,
            totalSentences: a.totalSentences + b.totalSentences,
            totalWords: a.totalWords + b.totalWords,
            uniqWords: _.uniq.apply(null, a.uniqWords.concat(b.uniqWords))
        };
        return sentenceStats;
    }, base);
}

/**
 * Simple word count.
 * @param words
 * @return {*} The word count. E.g `{word1: count1, word2: count2, ...}`
 */
function wordCount(words) {
    return _.reduce(words, function wordCount(acc, word) {
        acc[word] = acc[word] || 0;
        acc[word]++;
        return acc;
    }, {});
}

function unigramCounts(listsOfWords) {
    return wordCount(_.flatten(listsOfWords));
}

function bigramCounts(listsOfWords) {
    var bigramWords = _.map(listsOfWords, function produceBigramsAsWords(words) {
        var bigrams = nGrams.bigrams(words);
        return bigrams.map(serializeNgram); // bigramsAsWords

    });

    return wordCount(_.flatten(bigramWords));
}

function serializeNgram(words) {
    return [words].join(',');
}


/******************************************************************************
 * Expose functions
 ***/
exports.analyzeFiles = analyzeFiles;
exports.analyzeSentencesAndWords = analyzeSentencesAndWords;

// Pseudo-private
exports.stats = stats;
exports.sentences = parseSentences;
exports.wordsInSentence = parseWordsInSentence;
