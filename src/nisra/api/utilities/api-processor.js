/*
 See README.md in src/nisra for details
 */

/* eslint dot-notation: 0 */
/* eslint max-len: 0 */
/* eslint no-lonely-if: 0 */
/* eslint no-param-reassign: 0 */
/* eslint no-shadow: 0 */
/* eslint no-unused-vars: 0 */
/* eslint object-curly-newline: 0 */
/* eslint prefer-const: 0 */
/* eslint import/no-extraneous-dependencies: 0 */

// Debug mode
const DEBUG = false;

// libraries
const fs = require('fs-extra');
const path = require('path');

// helpers
const { toCsv, extractRows, addRecordToData, computeRanksAndPercentages, printProgress } = require('./helpers');

// data_dictionaries
const reducer = (map, option) => {
  map[option.id] = option;
  return map;
};
const reporters = require('../../data/reporters.json').reduce(reducer, {});
const partners = require('../../data/partners.json').reduce(reducer, {});
const commodities = require('../../data/commodities.json').reduce(reducer, {});
const years = require('../../data/years.json').reduce(reducer, {});

const reportersList = Object.keys(reporters);

// config
const srcDir = path.join(__dirname, '../');
const destDir = path.join(__dirname, '../../../../dist/nisra/api');
const outputFields = ['year', 'reporter', 'partner', 'partnerType', 'commodity', 'commodityType', 'importVal', 'exportVal', 'bilateralVal', 'balanceVal', 'importRank', 'exportRank', 'importPc', 'exportPc'];

// data structure preparation
console.log('Preparing data structure');
partners.all = {};
commodities.all = {};
years['all'] = {
  id: 'all', text: 'all'
};
const data = {};
reportersList.forEach((reporter) => {
  data[reporter] = {};
});

// data structure:
// data[reporter][partner][year][commodity]

// Read directory listing
console.log('Reading directory listing');
fs.readdir(srcDir)

  // Filter to only .txt files & read from each file & extract valid rows as objects
  .then(directoryListing => directoryListing.filter(filename => path.extname(filename) === '.txt'))
  .then(txtFilenames => Promise.all(txtFilenames.map(filename => fs.readFile(path.join(srcDir, filename)))))
  .then(fileContents => Promise.all(fileContents.map(fileContent => fileContent.toString().split('\n'))))
  .then(rowsByFile => rowsByFile.reduce((flat, toFlatten) => flat.concat(toFlatten), []))
  .then(txtRows => extractRows(txtRows))

  // Combine quarterly data into yearly data & combine flow values
  .then((quarterlyRecords) => {
    console.log(`Selected ${quarterlyRecords.length} quarterly records for processing. Consolidating quarterly data into yearly data...`);

    const yearlyRecords = quarterlyRecords.reduce((yearlyData, rowRecord) => {
      const { quarter, year, flow, nuts1, labarea, codseq, codalpha, sitc1, sitc2, value, mass } = rowRecord;
      const hash = `${year}_${nuts1}_${codalpha}_${sitc2}`;
      if (!yearlyData[hash]) {
        yearlyData[hash] = { year, nuts1, labarea, codalpha, sitc1, sitc2, importVal: 0, exportVal: 0, balanceVal: 0, bilateralVal: 0 };
      }
      if (flow === 'I') {
        yearlyData[hash].importVal += value;
      }
      if (flow === 'E') {
        yearlyData[hash].exportVal += value;
      }
      yearlyData[hash].balanceVal = yearlyData[hash].exportVal - yearlyData[hash].importVal;
      yearlyData[hash].bilateralVal = yearlyData[hash].exportVal + yearlyData[hash].importVal;
      return yearlyData;
    }, {});

    return Object.values(yearlyRecords);
  })

  .then((yearlyRecords) => {
    console.log(`Aggregated quarterly data into ${yearlyRecords.length} yearly records`);
    if (DEBUG) {
      console.log('DEBUG: Saving yearly records');
      const debugFile = path.join(destDir, 'debug.yearlyRecords.csv');
      const fields = ['year', 'nuts1', 'labarea', 'codseq', 'codalpha', 'sitc1', 'sitc2', 'importVal', 'exportVal', 'bilateralVal', 'balanceVal'];
      return fs.outputFile(debugFile, toCsv(yearlyRecords, fields))
        .then(() => yearlyRecords);
    }
    return yearlyRecords;
  })

  // Add rows to individual aggregate levels & add to data structure
  .then((yearlyRecords) => {
    console.log('Creating records at different aggregation levels and adding to the data object');
    return yearlyRecords.forEach(record => addRecordToData(record, data));
  })

  // Compute percentages and rankings
  .then(() => {
    console.log('Computing percentages and rankings');
    reportersList.forEach((reporter) => {
      console.log(`Computing percentages and rankings for ${reporter}`);
      computeRanksAndPercentages(data[reporter], 'sitc1', 'codealpha');
      computeRanksAndPercentages(data[reporter], 'sitc2', 'codealpha');
      computeRanksAndPercentages(data[reporter], 'sitc1', 'labarea');
      computeRanksAndPercentages(data[reporter], 'sitc2', 'labarea');
      computeRanksAndPercentages(data[reporter], 'all', 'labarea');
      computeRanksAndPercentages(data[reporter], 'all', 'codealpha');
    });
  })

  // Write output to files for byReporterYear
  .then(() => {
    console.log('Finished computing and sorting. Getting list of files to write.');

    const dataPaths = Object.keys(reporters);
    const totalFiles = dataPaths.length;
    console.log(`${totalFiles} files need to be written`);
    let filesWritten = 0;
    return Promise.all(dataPaths.map((dataPath) => {
      filesWritten++;
      const reporter = dataPath;
      const values = Object.values(data[reporter]);
      if (!values.length) return null;
      const destFile = path.join(destDir, `${reporter}.csv`);
      printProgress(`Writing file ${filesWritten} of ${totalFiles}`);
      return fs.outputFile(destFile, toCsv(values, outputFields));
    }));
  })
  .then(() => console.log('\nAll done!'));
