CS 5890 - OANC Grams
================================

    Ross Nordstrom
    University of Colorado - Colorado Springs
    CS 5890 - Computational Linguistics

## Assignment

1. Use OANC > MASC 3.0.0 data
2. Read in all text files in the sub-dirs of the OANC data, and:
  a. Count total number of documents (files)
  b. Produces some stats like min, mean, max, median lengths of documents
3. More stats analysis:
  a. Count total sentences in all text files
  b. Min, mean, max lengths of sentences
  c. How many total words in the files?
  d. How many distinct words in the files?
4. N-gram stats
  a. Count the unigram and bigram frequencies of words in the files
  b. Obtain the unsmoothed counts
  c. List the highest occurring 10 unigrams and bigrams
5. Good-Turing method:
  a. Smooth the counts with the Good-Turing method
  b. List the highest occurring 10 unigrams and brigrams
6. "Better" smoothing algo:
  a. Research a better alternative and use that
  b. Why is it better than Good-Turing
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
