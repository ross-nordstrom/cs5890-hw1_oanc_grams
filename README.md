CS 5890 - OANC Grams
================================

    Ross Nordstrom
    University of Colorado - Colorado Springs
    CS 5890 - Computational Linguistics

## Assignment

1. Use OANC > MASC 3.0.0 data
2. Read in all text files in the sub-dirs of the OANC data, and:
    1. Count total number of documents (files)
    2. Produces some stats like min, mean, max, median lengths of documents
3. More stats analysis:
    1. Count total sentences in all text files
    2. Min, mean, max lengths of sentences
    3. How many total words in the files?
    4. How many distinct words in the files?
4. N-gram stats
    1. Count the unigram and bigram frequencies of words in the files
    2. Obtain the unsmoothed counts
    3. List the highest occurring 10 unigrams and bigrams
5. Good-Turing method:
    1. Smooth the counts with the Good-Turing method
    2. List the highest occurring 10 unigrams and brigrams
6. "Better" smoothing algo:
    1. Research a better alternative and use that
    2. Why is it better than Good-Turing
7. Write a short paper detailing what was done, .... and more .....
  

## Dataset
**Datasets used, and their location in this project:**

**Dataset** | **Source** | **Path** | **Type** *
---|---|---|---

**Dataset Types:** *

## Usage
This project is intended to be used via the CLI, and is exposed as an NPM package.

### Installation
**From NPM:**
```sh
npm install -g rdn-oanc-grams
```

**From local:**
```sh
git clone git@github.com:ross-nordstrom/cs5890-hw1_oanc_grams.git
cd cs5890-hw1_oanc_grams
npm install
npm link
```

### Running
**View Usage:**
Rather than document the usage here, please see the tool's help documentation. In general, the tool
expects to be given a dataset which it will analyze statistically.

```sh
rdn-oanc-grams -h
```

### Testing
```sh
npm install
npm test
```
