/* global window */
/*
 * THIS FILE SETS UP THE topImportMarkets chart
 * */
import $ from 'jquery';
import * as d3 from 'd3';

import data from '../data';
import rowchart from '../rowchart';
import gui from '../gui';

const $container = $('#topImportMarkets');
const $chart = $container.children('.chart');
const $chartTitle = $container.children('.chartTitle');

const height = $chart.height();
const width = $chart.width();
const svg = d3.select('#topImportMarkets .chart')
  .append('svg')
  .attr('xmlns', 'http://www.w3.org/2000/svg')
  .attr('version', 1.1)
  .classed('svgChart', true)
  .attr('height', height)
  .attr('width', width);
const numEntries = 10;

const chart = {

  setup() {
    // Bind the refresh function to the refreshFilters event
    $chart.on('refreshFilters', chart.refresh);
    // Bind the resize function to the window resize event
    $(window).on('resize', () => {
      rowchart.resizeSvg(svg, $chart.width());
    });
    // Setup the svg
    rowchart.setup(svg);
    // Hide on load
    $container.slideUp(0);
  },

  refresh(event, filters) {
    // CASE 1: reporter = null
    if (!filters.reporter) {
      $container.slideUp();
      return;
    }

    // We build a queryFilter and a dataFilter object to make
    // API queries more generic than data queries
    const queryFilter = {
      reporter: +filters.reporter,
      partner: 'all',
      year: filters.year,
      commodity: 'AG2',
      initiator: 'topImportMarkets',
      type: filters.type
    };
    const dataFilter = {
      reporter: +filters.reporter,
      partner: 'all',
      year: filters.year,
      commodity: 'AG2',
      type: filters.type
    };
    let title = '';

    // Define flow
    dataFilter.flow = 1;

    // CASE 2: reporter = selected    commodity = null        partner = null or 0
    if (filters.reporter && !filters.commodity && (!filters.partner || +filters.partner === 0)) {
      queryFilter.commodity = 'TOTAL';
      dataFilter.commodity = 'TOTAL';
      title = `${data.lookup(filters.reporter, 'reporterAreas', 'text')} - Top-10 import markets for ${({ S: 'services', C: 'goods' })[filters.type]} in ${filters.year}`;
    }

    // CASE 3: reporter = selected    commodity = null        partner = selected
    if (filters.reporter && !filters.commodity && filters.partner && +filters.partner !== 0) {
      $chartTitle.html('');
      $container.slideUp();
      return;
    }

    // CASE 4: reporter = selected    commodity = selected    partner = selected
    if (filters.reporter && filters.commodity && filters.partner && +filters.partner !== 0) {
      $chartTitle.html('');
      $container.slideUp();
      return;
    }

    // CASE 5: reporter = selected    commodity = selected    partner = null
    // This is already covered by the data in CASE 2 so we don't specify
    // the commodity in the query to avoid duplicate data
    if (filters.reporter && filters.commodity && (!filters.partner || +filters.partner === 0)) {
      queryFilter.commodity = filters.commodity;
      dataFilter.commodity = filters.commodity;
      title = `${data.lookup(filters.reporter, 'reporterAreas', 'text')} - Top-10 import markets for ${data.commodityName(filters.commodity, filters.type)} in ${filters.year}`;
    }

    // Run API query
    data.query(queryFilter, (err, ready) => {
      if (err) { gui.showError(err); }
      if (err || !ready) { return; }
      // Get the data, update title, display panel and update chart
      const newData = data.getData(dataFilter, numEntries);
      // Set chart title
      $chartTitle.html(title);
      // Set download link
      $container.find('.downloadData').unbind('click').on('click', (e) => {
        e.preventDefault();
        gui.downloadCsv(title, newData);
      });
      $container.slideDown(400, () => {
        rowchart.draw(svg, newData, dataFilter, chart.colors[0][0]);
      });
    });
  }

};

export default chart;
