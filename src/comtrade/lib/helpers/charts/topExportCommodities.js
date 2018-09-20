/* global window */
/*
 * THIS FILE SETS UP THE topExportCommodities chart
 * */
import $ from 'jquery';
import * as d3 from 'd3';

import data from '../data';
import rowchart from '../rowchart';
import gui from '../gui';

const $container = $('#topExportCommodities');
const $chart = $container.children('.chart');
const $chartTitle = $container.children('.chartTitle');

const height = $chart.height();
const width = $chart.width();
const svg = d3.select('#topExportCommodities .chart')
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

    // We build a queryFilter and a dataFilter object
    // to make API queries more generic than data queries
    const queryFilter = {
      reporter: +filters.reporter,
      partner: 0,
      year: +filters.year,
      commodity: 'AG2',
      initiator: 'topExportCommodities',
      type: filters.type
    };
    const dataFilter = {
      reporter: +filters.reporter,
      partner: 0,
      year: +filters.year,
      commodity: 'AG2',
      type: filters.type
    };
    let title = '';

    // Define flow
    dataFilter.flow = 2;

    // CASE 2: reporter = selected    commodity = null        partner = null
    if (filters.reporter && (!filters.commodity || filters.commodity === 'TOTAL') && !filters.partner) {
      title = `${data.lookup(filters.reporter, 'reporterAreas', 'text')} - Top-10 exports of ${({ S: 'services', C: 'goods' })[filters.type]} to the world in ${filters.year}`;
    }

    // CASE 3: reporter = selected    commodity = null        partner = selected
    if (filters.reporter && (!filters.commodity || filters.commodity === 'TOTAL') && filters.partner) {
      title = `${data.lookup(filters.reporter, 'reporterAreas', 'text')} - Top-10 exports of ${({ S: 'services', C: 'goods' })[filters.type]} to ${data.lookup(filters.partner, 'partnerAreas', 'text')} in ${filters.year}`;
      queryFilter.partner = +filters.partner;
      dataFilter.partner = +filters.partner;
    }

    // CASE 4: reporter = selected    commodity = selected    partner = selected
    if (filters.reporter && filters.commodity && filters.commodity !== 'TOTAL' && filters.partner) {
      $chartTitle.html('');
      $container.slideUp();
      return;
    }

    // CASE 5: reporter = selected    commodity = selected    partner = null
    if (filters.reporter && filters.commodity && filters.commodity !== 'TOTAL' && !filters.partner) {
      $chartTitle.html('');
      $container.slideUp();
      return;
    }

    $chartTitle.html(title);
    data.query(queryFilter, (err, ready) => {
      if (err) { gui.showError(err); }
      if (err || !ready) { return; }
      // Get the data, update title, display panel and update chart
      const newData = data.getData(dataFilter, numEntries);
      //             if (newData.length == 0) {console.warn('no new data in ' + title)}
      // Set chart title
      $chartTitle.html(title);
      // Set download link
      $container.find('.downloadData').unbind('click').on('click', (e) => {
        e.preventDefault();
        gui.downloadCsv(title, newData);
      });
      $container.slideDown(400, () => {
        rowchart.draw(svg, newData, dataFilter, chart.colors[0][1]);
      });
    });
  }
};

export default chart;
