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

exports.stats = stats;