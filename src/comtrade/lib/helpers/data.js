/* global window document */
/*
 * THIS FILE MANAGES API QUERIES AND CROSSFILTER SETUP
 * */

import * as d3 from 'd3';
import $ from 'jquery';
import crossfilter from 'crossfilter';

// data imports
import reporterAreasSelectOptions from '../../data/reporterAreas.json';
import partnerAreasSelectOptions from '../../data/partnerAreas.json';
import yearsSelectOptions from '../../data/years.json';
import commodityCodesSelectOptions from '../../data/classificationHS_AG2.json';
import serviceCodesSelectOptions from '../../data/classificationEB02.topLevel.json';
import isoCodes from '../../data/isoCodes.json';
import worldJson from '../../data/world-110m.json';

const countryByISONumMap = d3.map(isoCodes, d => d.isoNumerical);
const countryByUnNumMap = d3.map(isoCodes, d => d.unCode);
const areasByISONum = isoNum => isoCodes.filter(el => +el.isoNumerical === +isoNum);

const xFilter = crossfilter();

const data = {
  /*
   * PROPERTIES
   * Some basic properties that we store and persist throughout the application
   */

  baseQueryUrl: '/api/get?fmt=csv&max=50000&freq=A&rg=1%2C2',

  // queryHistory, queryQueue and timestamp are used to throttle and debounce queries
  queryHistory: [],
  queryQueue: [],
  queryRunning: [],
  timestamp: 0,

  // Reporter, partner and classification arrays for select2 widgets
  reporterAreasSelectOptions,
  partnerAreasSelectOptions,
  commodityCodesSelectOptions,
  serviceCodesSelectOptions,
  yearsSelectOptions,
  typeCodesSelectOptions: [{
    id: 'C',
    text: 'Goods',
    parent: '#'
  }, {
    id: 'S',
    text: 'Services',
    parent: '#'
  }],
  serviceCodesMap: d3.map(serviceCodesSelectOptions, d => d.id),
  reporterAreasMap: d3.map(reporterAreasSelectOptions, d => d.id),
  partnerAreasMap: d3.map(partnerAreasSelectOptions, d => d.id),
  flowByCodeMap: d3.map([{ id: '1', text: 'imports' }, { id: '2', text: 'exports' }, { id: '0', text: 'balance' }], d => d.id),
  commodityCodesMap: d3.map(commodityCodesSelectOptions, d => d.id),
  countryByUnNumMap,
  countryByISONumMap,
  areasByISONum,

  worldJson,

  // Crossfilter data
  xFilter,
  // Setup crossfilter dimensions
  xFilterByReporter: xFilter.dimension(d => +d.reporter),
  xFilterByPartner: xFilter.dimension(d => +d.partner),
  xFilterByYear: xFilter.dimension(d => +d.year),
  xFilterByType: xFilter.dimension(d => d.type),
  xFilterByCommodity: xFilter.dimension(d => d.commodity),
  xFilterByFlow: xFilter.dimension(d => +d.flow),
  xFilterByAmount: xFilter.dimension(d => +d.value),

  // Formatting functions
  commodityName(commodity, type) {
    try {
      let text;
      let comm;
      switch (type) {
        case 'C':
          comm = this.commodityCodesMap.get(commodity.toString());
          text = comm.text.slice(comm.text.indexOf(' - ') + 3);
          break;
        case 'S':
          // TODO FEATURE this could be imprved to consider
          // parents e.g. "Transport" for "Passengers"
          comm = this.serviceCodesMap.get(commodity.toString());
          text = comm.text.slice(comm.text.indexOf(' ') + 1);
          break;
        default:
          break;
      }
      return text;
    } catch (err) {
      console.warn(`There was a problem getting a commodity name for ${commodity} of type ${type}: ${err}`);
      return 'unknown';
    }
  },
  numFormat(num) {
    let f = d3.format('$,.1f');
    if (typeof num !== 'number' || isNaN(num)) return 'No data';
    if (num === 0) return '0';
    // Display in billions/millios/thousands
    if (Math.abs(num) >= 1000000000) return `${f((Math.round(num / 100000000)) / 10)} bn`;
    if (Math.abs(num) >= 1000000) return `${f((Math.round(num / 100000)) / 10)} m`;
    if (Math.abs(num) >= 1000) return `${f((Math.round(num / 100)) / 10)} th`;
    // Else display without unit
    f = d3.format('$,f');
    return f(num);
  },
  numFormatFull(num) {
    const f = d3.format('$,');
    return f(num);
  },
  numOrdinal(num) {
    if (isNaN(num) || num % 1) { return num; }
    if (num < 20 && num > 10) { return `${num}th`; }
    const last = num.toString().slice(-1);
    let text = '';
    switch (last) {
      case '1':
        text = `${num}st`;
        break;
      case '2':
        text = `${num}nd`;
        break;
      case '3':
        text = `${num}rd`;
        break;
      default:
        text = `${num}th`;
        break;
    }
    return text;
  },
  // lookup function which does error handling so we don't have to do it elsewhere in the app
  lookup: (lookupVal, mapName, propertyName) => {
    try {
      return data[`${mapName}Map`].get(lookupVal)[propertyName];
    } catch (err) {
      console.warn(`There was a problem looking up ${lookupVal} in ${mapName}.${propertyName}: ${err}`);
      return 'unknown';
    }
  },

  /* PUBLIC METHODS */

  /*
   * Run an API query
   * filters argument should be an object in the following form:
   * {
   *   reporter: 826,     // Reporter code in UN format
   *   partner:  862,     // Partner code in UN format
   *   year:     'all',   // Year can be 'all' or apecific year: 2012
   *                      // (FUTURE: Multi-year queries are allowed for up to 5 years)
   *   commodity:72       // Can be a specific 2-digit HS code or
   *                      // 'TOTAL' or 'AG2' or an EB02 code for a service
   *   type:     'S'      // Can be either S or C for service or commodities
   * }
   * Callback is called with callback(error, ready)
   * ready will be true if new data was received and added to crossfilter or false otherwise.
   */
  query(filters, callback) {
    // Get current time and build URL
    const requestUrl = this.buildUrl(filters);
    const time = new Date();

    // Check history to see if query was already run and skip the call if it was already run
    if (this.queryHistory.indexOf(requestUrl) > -1) {
      callback(null, true);
      return;
    }

    // If the API was called less than a second ago, or if the query is in the queue then we need to
    // postpone the call and fire the queryQueueUpdate event
    const timeAgo = time.getTime() - this.timestamp;
    if (timeAgo < 1100 || this.queryRunning.indexOf(requestUrl) > -1) {
      window.setTimeout(() => { this.query(filters, callback); }, timeAgo + 100);
      if (this.queryQueue.indexOf(requestUrl) < 0) {
        this.queryQueue.push(requestUrl);
        this.fireQueryQueueUpdateEvent();
      }
      callback(null, false);
      return;
    }

    // Make call
    $.ajax({
      url: requestUrl,
      timeout: 75000,
      // NOTE: context setting is imporant as it binds the
      // callback to the data object we are creating.
      // Otherwise we cannot access any of the properties in the callback.
      context: this,
      beforeSend(xhr) {
        // Set the timestamp so that other queries will queue and add the
        // current query to the list of running queries.
        this.timestamp = time.getTime();
        this.queryRunning.push(requestUrl);
        $('#loadingDiv #cancelRequest').on('click', () => {
          xhr.abort();
          $('#loadingDiv').fadeOut();
        });
        $('#loadingDiv').fadeIn();
      },
      success: function success(result) {
        // Add data to crossfilter and the query to the history
        this.addData(result, filters);
        this.queryHistory.push(requestUrl);
        // Callback
        callback(null, true);
      },
      error: function error(xhr, status, err) {
        // If error is 409 then check the response text and requeue if rate
        // limit is reached or display error if hourly limit is reached
        // Responses have dirty charachters so we use a regex and replace
        // to reduce the response to only printable ASCII chars.
        if (xhr.status === 409 && xhr.responseText.replace(/[^\x20-\x7E]+/g, '') === 'RATE LIMIT: You must wait 1 seconds.') {
          console.log('API 409 Error: Requeueing the request.');
          this.query(requestUrl, callback);
          callback(null, false);
        } else if (xhr.status === 409 && xhr.responseText.replace(/[^\x20-\x7E]+/g, '').indexOf('USAGE LIMIT: Hourly usage limit of 100 actions reached.') > -1) {
          console.log('API 409 Error: API LIMIT REACHED!');
          // Clear the queue here FIX this does not work perfectly...
          this.queryQueue = [];
          this.fireQueryQueueUpdateEvent();
          callback('Your IP address has reached 100 requests to the Comtrade API within the hour. Please wait one hour and then try again.', null);
        } else {
          console.log('Unknown API error');
          callback(`${status} ${err} ${xhr.responseText}`, null);
        }
      },
      complete() {
        // Remove it from queryQueue and queryRunning if it was there
        const runningItem = this.queryRunning.indexOf(requestUrl);
        if (runningItem > -1) { this.queryRunning.splice(runningItem, 1); }
        const queueItem = this.queryQueue.indexOf(requestUrl);
        if (queueItem > -1) { this.queryQueue.splice(queueItem, 1); }

        // Fire the queryQueueUpdate event on window
        this.fireQueryQueueUpdateEvent();

        // If finished then hide the loadingDiv
        if (this.queryQueue.length === 0 && this.queryRunning.length === 0) {
          $('#loadingDiv').fadeOut();
          $('#loadingDiv #cancelRequest').off('click');
        }
      }
    });
  },


  /*
   * Get a dataset for display
   * filters argument should be an object in the following form:
   * {
   *   reporter: 826,     // Reporter code
   *   partner:  862,     // Partner code
   *   year:     'all',   // Year
   *   type:     'S'      // Type can be 'S' or 'C' for service or good
   *   commodity:72       // Can be a specific 2-digit HS code or 'TOTAL' or 'AG2'
   * }
   * limit will be used to return the top x number of records
   */
  getData(filters, limit) {
    // Clear all filters on the xFilter
    this.xFilterByReporter.filterAll();
    this.xFilterByPartner.filterAll();
    this.xFilterByType.filterAll();
    this.xFilterByYear.filterAll();
    this.xFilterByCommodity.filterAll();
    this.xFilterByFlow.filterAll();
    this.xFilterByAmount.filterAll();

    // Add filters by each dimension
    if (typeof filters.reporter !== 'undefined') { this.xFilterByReporter.filter(+filters.reporter); }
    // NOTE: when partner=all we return all except the world
    //       when partner=num we return that
    //       when partner=undefined we return all including world by not filtering
    if (typeof filters.partner !== 'undefined' && filters.partner === 'all') { this.xFilterByPartner.filter(d => (+d !== 0)); }
    if (typeof filters.partner !== 'undefined' && filters.partner !== 'all') { this.xFilterByPartner.filter(+filters.partner); }
    if (typeof filters.year !== 'undefined' && filters.year !== 'all') { this.xFilterByYear.filter(+filters.year); }
    if (typeof filters.type !== 'undefined') { this.xFilterByType.filter(filters.type); }

    // If a specific commodity is selected then filter by it
    if (typeof filters.commodity !== 'undefined' && filters.commodity !== 'AG2' && filters.commodity !== 'TOTAL') { this.xFilterByCommodity.filter(filters.commodity); }
    // If AG2 is requested return all commodities excluding TOTALS
    // (keeping in account that the value is TOTAL for goods and 200 for services)
    if (typeof filters.commodity !== 'undefined' && filters.commodity === 'AG2') { this.xFilterByCommodity.filter(d => (d !== 'TOTAL' && +d !== 200)); }
    // If no commodity is selected or TOTAL is selected then return TOTALS
    // (keeping in account that the value is TOTAL for goods and 200 for services)
    if (typeof filters.commodity === 'undefined' || filters.commodity === 'TOTAL') { this.xFilterByCommodity.filter(d => (d === 'TOTAL' || +d === 200)); }

    if (typeof filters.flow !== 'undefined' && +filters.flow !== 0) { this.xFilterByFlow.filter(filters.flow); }

    // Get the data from xFilter
    const lim = limit || Infinity;
    const newData = this.xFilterByAmount.top(lim);

    // Return resulting records
    return newData;
  },


  /*
   * Takes a dataset where imports and exports are in different records
   * and combines them into a dataset with a single record per partner
   * and different properties for import, export, balance and ranking (on the same record).
   * This should be called after getting data which includes "world" as a
   * partner so that percentages of imports and exports will be calculated.
   */
  combineData(ieData) {
    let combinedData = [];
    const dataMap = d3.map();
    let totImports = 0;
    let totExports = 0;
    const worldDetails = {};
    // Filter out values of partner = world while setting totImports and totExports
    // We save these values to re-add later manually after we calculate rankings
    const impExpData = ieData.filter((v) => {
      if (+v.partner !== 0) { return true; }

      worldDetails.reporter = v.reporter;
      worldDetails.partner = v.partner;
      worldDetails.type = v.type;
      worldDetails.commodity = v.commodity;
      worldDetails.year = v.year;
      if (v.flow === 1) {
        totImports = v.value;
        worldDetails.importVal = v.value;
      }
      if (v.flow === 2) {
        totExports = v.value;
        worldDetails.exportVal = v.value;
      }
      return false;
    });
    worldDetails.bilateralVal = worldDetails.importVal + worldDetails.exportVal;
    worldDetails.balanceVal = worldDetails.exportVal - worldDetails.importVal;


    // Iterate through mixed data array and create the combined array in a d3 map
    impExpData.forEach((d) => {
      // Copy the item, set the accessor and rename the value property to importVal or exportVal
      const valName = ['importVal', 'exportVal'][+d.flow - 1];
      const record = $.extend({}, d);
      record.importVal = null;
      record.exportVal = null;
      record[valName] = record.value;
      delete record.value;

      // If data for other flow is already present in combinedData add to it otherwise add record
      if (dataMap.has(record.partner)) {
        const previousRecord = dataMap.get(record.partner);
        previousRecord[valName] = record[valName];
        dataMap.set(previousRecord.partner, previousRecord);
      } else {
        dataMap.set(record.partner, record);
      }
    });

    // Extract collection from map and then calculate bilateral, balance, import and export pc
    combinedData = dataMap.values();
    combinedData = combinedData.map((v) => {
      const d = v;
      if (d.importVal && d.exportVal) {
        d.bilateralVal = d.exportVal + d.importVal;
        d.balanceVal = d.exportVal - d.importVal;
      }
      if (d.importVal && totImports !== 0) {
        d.importPc = (d.importVal / totImports) * 100;
      }
      if (d.exportVal && totExports !== 0) {
        d.exportPc = (d.exportVal / totExports) * 100;
      }
      return d;
    });

    // Sort by importVal & assign importRank
    combinedData.sort((a, b) => +(b.importVal > a.importVal) || +(b.importVal === a.importVal) - 1);
    combinedData.forEach((v, i) => {
      if (v.importVal) { combinedData[i].importRank = i + 1; }
    });

    // Sort by exportVal & assign exportRank
    combinedData.sort((a, b) => +(b.exportVal > a.exportVal) || +(b.exportVal === a.exportVal) - 1);
    combinedData.forEach((v, i) => {
      if (v.exportVal) { combinedData[i].exportRank = i + 1; }
    });

    // Add world value back
    combinedData.push(worldDetails);

    return combinedData;
  },


  /*
   * PRIVATE METHODS
   * (methods that are only used internally in the data module)
   */
  buildUrl(filters) {
    let requestUrl = this.baseQueryUrl;
    if (typeof filters.reporter !== 'undefined') { requestUrl += `&r=${filters.reporter}`; } else { requestUrl += '&r=0'; }
    if (typeof filters.partner !== 'undefined') { requestUrl += `&p=${filters.partner}`; } else { requestUrl += '&p=all'; }

    if (typeof filters.year !== 'undefined' && filters.year !== null) {
      requestUrl += `&ps=${filters.year}`;
    } else {
      requestUrl += '&ps=now';
    }
    // Build URL for goods
    if (typeof filters.type !== 'undefined' && filters.type === 'C') {
      requestUrl += '&type=C&px=HS';
      if (typeof filters.commodity !== 'undefined') { requestUrl += `&cc=${filters.commodity}`; } else { requestUrl += '&cc=AG2'; }
    }
    // Build URL for services
    if (typeof filters.type !== 'undefined' && filters.type === 'S') {
      requestUrl += '&type=S&px=EB02';
      if (typeof filters.commodity === 'undefined' || filters.commodity === 'TOTAL' || filters.commodity === 'ALL' || filters.commodity === 'AG2') {
        // If no specific commodity code is specified or a TOTAL or ALL has been requested,
        // instead using ALL that would return all nested levels, if we have less than 20
        // options in the dropdown we query the api listing all of those instead
        // e.g. for the 11 top level categories.
        if (filters.commodity === 'TOTAL') {
          requestUrl += '&cc=200';
        } else if (this.serviceCodesSelectOptions.length < 20) {
          requestUrl += '&cc=';
          const svcTypes = [];
          this.serviceCodesSelectOptions.forEach((i) => {
            svcTypes.push(i.id);
          });
          requestUrl += svcTypes.join();
          requestUrl.slice(0, -3);
        } else {
          requestUrl += '&cc=ALL';
        }
      } else {
        // If a commodityCode is specified then add it to the query
        requestUrl += `&cc=${filters.commodity}`;
      }
    }
    return requestUrl;
  },

  addData(csvData, filters) {
    // Parse and select the fields from the response we want to store
    const newData = d3.csvParse(csvData, d => ({
      reporter: +d['Reporter Code'],
      partner: +d['Partner Code'],
      year: +d.Year,
      // We infer the type from the classification field. Goods start
      // with "H" but can be H0, H1, H2, H3, H4 while services have classification EB
      type: ({ H: 'C', E: 'S' })[d.Classification.slice(0, 1)],
      commodity: d['Commodity Code'],
      flow: +d['Trade Flow Code'],
      value: +d['Trade Value (US$)']
    }));
    // Run the filters on xFilter and extract the data we already may
    // have (unset the partner filter to include world)
    const dataFilter = $.extend({}, filters);
    if (dataFilter.partner === 'all') { delete dataFilter.partner; }
    const xFdata = this.getData(dataFilter);

    // Filter out duplicate records in newData that are already in xFilter before adding newData
    const duplicates = [];
    const insertData = newData.filter((nd) => {
      // Iterate over xFdata and check for duplicates
      let dup = false;
      xFdata.forEach((xd) => {
        if (
          nd.reporter === xd.reporter &&
          nd.partner === xd.partner &&
          nd.type === xd.type &&
          nd.commodity === xd.commodity &&
          nd.flow === xd.flow &&
          nd.year === xd.year &&
          nd.value === xd.value
        ) {
          dup = true;
          duplicates.push(nd);
        }
      });
      return !dup;
    });
    // Add the new data to xFilter (check first it is valid )
    if ((insertData.length === 1) && (typeof (insertData[0].type) === 'undefined')) {
      console.warn('API QUERY FAILED from %s: r=%s p=%s cc=%s type=%s y=%s', filters.initiator, filters.reporter, filters.partner, filters.commodity, filters.type, filters.year);
      console.groupCollapsed('details...');
      console.log(csvData, newData, insertData);
      console.groupEnd();
    } else {
      this.xFilter.add(insertData);
    }
    console.groupCollapsed('API QUERY SUCCESS from %s: r=%s p=%s cc=%s type=%s y=%s', filters.initiator, filters.reporter, filters.partner, filters.commodity, filters.type, filters.year);
    console.log('filters: %o', filters);
    console.log('Added %d new records. Retrieved %d records. Checked %d possible matches and discarded %d duplicates. New xFilter size: %d', insertData.length, newData.length, xFdata.length, duplicates.length, this.xFilter.size());
    console.log('duplicates discarded: %o', duplicates);
    console.groupEnd();
  },

  fireQueryQueueUpdateEvent() {
    const event = document.createEvent('Events');
    event.initEvent('queryQueueUpdate', true, true);
    event.queryCount = this.queryQueue.length + this.queryRunning.length;
    window.dispatchEvent(event);
  }

};

export default data;
