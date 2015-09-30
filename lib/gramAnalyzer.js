/**
 * Naive bayes classifier
 * @module GramAnalyzer
 * @description TODO
 */

/*global exports, process, require, exports */
"use strict";

var _ = require('underscore');

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

/**
 * For a given file content blob, parse out the sentences as a list
 * @param {string} text
 * @returns {string[]} The sentences, excluding punctuation
 */
function sentences(text) {

    // Sentences are separated by newlines
    // Split the text on newlines, then trim the resulting strings of excess whitespace
    // and finally filter out empty lines, leaving just the sentences
    return _.reject(text.split('\n').map(_.partial(_.trim, _, ' ')), _.isEmpty)
}

/**
 * Get the number of words in a sentend
 * @param {string} sentence
 * @returns {Number}
 */
function wordsInSentence(sentence) {
    return sentence.split(' ').length;
}

exports.stats = stats;
exports.sentences = sentences;
exports.wordsInSentence = wordsInSentence;