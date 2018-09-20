/* global window document */
/* eslint no-restricted-syntax: 0 */
/* eslint object-curly-newline: 0 */
/*
 * THIS FILE MANAGES API QUERIES AND CROSSFILTER SETUP
 * */

import * as d3 from 'd3';
import $ from 'jquery';
import crossfilter from 'crossfilter';

// data files
import reporters from '../../data/reporters.json';
import partners from '../../data/partners.json';
import years from '../../data/years.json';
import commodities from '../../data/commodities.json';
import { toTitleCase } from './utils';

// privates

// config
const baseQueryUrl = '/api';
const queryHistory = [];
const runningQueries = {};

// xfilter
const xFilter = crossfilter();
const dimensions = {
  byReporter: xFilter.dimension(d => d.reporter),
  byPartner: xFilter.dimension(d => d.partner),
  byPartnerType: xFilter.dimension(d => d.partnerType),
  byYear: xFilter.dimension(d => +d.year),
  byCommodity: xFilter.dimension(d => d.commodity),
  byCommodityType: xFilter.dimension(d => d.commodityType),
  byImportValue: xFilter.dimension(d => +d.importVal),
  byExportValue: xFilter.dimension(d => +d.exportVal)
};

// private utility methods
const buildUrl = filters => `${baseQueryUrl}/${filters.reporter}.csv`;

const equals = (a, b) => {
  const props = ['year', 'reporter', 'partner', 'partnerType', 'commodity', 'commodityType', 'importVal', 'exportVal'];
  for (const prop of props) {
    if (a[prop] !== b[prop]) return false;
  }
  return true;
};

const getData = (filters, limit, flow) => {
  const {
    reporter,
    year = null,
    partner = null,
    partnerType = null,
    commodity = null,
    commodityType = null
  } = filters;
  if (typeof reporter === 'undefined') throw new Error(`Reporter must be defined when calling getData (reporter: ${reporter}`);

  // Clear all existing filters
  Object.keys(dimensions).forEach(dimensionName => dimensions[dimensionName].filterAll());

  // Apply new filters
  dimensions.byReporter.filter(reporter);
  dimensions.byYear.filter(year);
  dimensions.byPartner.filter(partner);
  dimensions.byPartnerType.filter(partnerType);
  dimensions.byCommodity.filter(commodity);
  dimensions.byCommodityType.filter(commodityType);

  // Return filtered results
  const dimensionName = flow ? `by${toTitleCase(flow)}Value` : 'byImportValue';
  return dimensions[dimensionName].top(limit || Infinity);
};

const addData = (csvData, filters) => {
  const newData = d3.csvParse(csvData)
    .map(record => ({
      ...record,
      year: +record.year,
      exportPc: +record.exportPc,
      exportRank: +record.exportRank,
      importPc: +record.importPc,
      importRank: +record.importRank,
      importVal: +record.importVal * 1000,
      exportVal: +record.exportVal * 1000,
      balanceVal: +record.balanceVal * 1000,
      bilateralVal: +record.bilateralVal * 1000
    }));
  const existingData = getData({
    ...filters,
    partner: filters.partner !== 'all' ? filters.partner : null,
    commodity: filters.commodity !== 'all' ? filters.commodity : null,
    year: filters.year !== 'all' ? filters.year : null
  });
  const dedupedData = newData
    .filter(newRec => existingData
      .reduce((acc, existingRec) => acc && !equals(existingRec, newRec), true));
  xFilter.add(dedupedData);

  console.groupCollapsed('API QUERY SUCCESS from %s: %s (%d records)', filters.initiator, buildUrl(filters), newData.length);
  console.log('filters: %o', filters);
  console.log(
    'Added %d new records. Retrieved %d records. Checked %d possible matches and discarded %d duplicates. New xFilter size: %d',
    dedupedData.length, newData.length, existingData.length,
    newData.length - dedupedData.length, xFilter.size()
  );
  console.groupEnd();
};

const fireQueryQueueUpdateEvent = () => {
  const event = document.createEvent('Events');
  event.initEvent('queryQueueUpdate', true, true);
  event.queryCount = Object.keys(runningQueries).length;
  window.dispatchEvent(event);
};

const query = (filters, callback) => {
  // Build URL & check if it has already been run or if it's presently running
  const requestUrl = buildUrl(filters);
  const isQueryCompleted = queryHistory.indexOf(requestUrl) > -1;
  const isQueryRunning = Object.keys(runningQueries).indexOf(requestUrl) > -1;
  if (isQueryCompleted) return callback();
  if (isQueryRunning) return runningQueries[requestUrl].push(callback);
  runningQueries[requestUrl] = [callback];
  fireQueryQueueUpdateEvent();

  // Make the ajax call
  return $.ajax({
    url: requestUrl,
    timeout: 75000,
    beforeSend(xhr) {
      $('#loadingDiv #cancelRequest').on('click', () => {
        xhr.abort();
        $('#loadingDiv').fadeOut();
      });
      $('#loadingDiv').fadeIn();
    },
    success(result) {
      // Add data to crossfilter, the query to the history
      addData(result, filters);
      queryHistory.push(requestUrl);
    },
    error(xhr, status, err) {
      console.log('API Error:', err);
      runningQueries[requestUrl].forEach(cb => cb(`${status} ${err} ${xhr.responseText}`));
    },
    complete() {
      runningQueries[requestUrl].forEach(cb => cb());
      delete runningQueries[requestUrl];
      fireQueryQueueUpdateEvent();
      // If finished then hide the loadingDiv
      if (Object.keys(runningQueries).length === 0) {
        $('#loadingDiv').fadeOut();
        $('#loadingDiv #cancelRequest').off('click');
      }
    }
  });
};

// exported object
const data = {

  // data arrays for select2 & choropleth
  reporters,
  partners,
  commodities,
  years,

  getData,
  query,

  // lookup hashes/maps
  reportersMap: d3.map(reporters, d => d.id),
  partnersMap: d3.map(partners, d => d.id),
  partnersByMapNumericalMap: d3.map(partners, d => d.mapNumerical),
  commoditiesMap: d3.map(commodities, d => d.id),

  // lookup function with error handling
  lookup: (lookupVal, mapName, propertyName) => {
    try {
      return data[`${mapName}Map`].get(lookupVal)[propertyName];
    } catch (err) {
      // console.log(`There was a problem looking up ${lookupVal} in ${mapName}.${propertyName}: ${err}`);
      return null;
    }
  }

};

export default data;
