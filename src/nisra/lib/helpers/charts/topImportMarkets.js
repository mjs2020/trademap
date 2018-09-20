/* global window */
/* eslint object-curly-newline: 0 */
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
      rowchart.resizeSvg(svg, $chart.width(), 'importVal');
    });
    // Setup the svg
    rowchart.setup(svg);
    // Hide on load
    $container.slideUp(0);
  },

  refresh(event, filters) {
    const { reporter, partner, commodity, year } = filters;

    // CASE 1: reporter = null
    // CASE 3: commodity = null        partner = selected
    // CASE 4: commodity = selected    partner = selected
    if (
      reporter === null ||
      typeof reporter === 'undefined' ||
      partner !== null
    ) return $container.slideUp();

    // We build queryFilter & dataFilter objects to make API queries more generic than data queries
    const queryFilter = {
      reporter,
      initiator: 'topImportMarkets'
    };
    const dataFilter = {
      reporter,
      year,
      // TODO see https://github.com/mjs2020/trademap/issues/25
      partnerType: 'codealpha',
      initiator: 'topImportMarkets'
    };
    let title = '';

    if (commodity === null) {
      // CASE 2: commodity = null        partner = null
      title = `${data.lookup(reporter, 'reporters', 'text')} - Top-10 import markets in ${year}`;
      dataFilter.commodity = 'all';
    } else {
      // CASE 5: commodity = selected    partner = null
      // This is already covered by the data in CASE 2 so we don't specify
      // the commodity in the query to avoid duplicate data
      title = `${data.lookup(reporter, 'reporters', 'text')} - Top-10 import markets for ${data.lookup(commodity, 'commodities', 'text')} in ${year}`;
      dataFilter.commodity = commodity;
    }

    $chartTitle.html(title);

    return data.query(queryFilter, (err) => {
      if (err) { gui.showError(err); }

      const newData = data.getData(dataFilter, numEntries);

      // Set download link
      $container.find('.downloadData').unbind('click').on('click', (e) => {
        e.preventDefault();
        gui.downloadCsv(title, newData);
      });

      $container.slideDown(400, () => {
        rowchart.draw(svg, newData, chart.colors[0][0], 'importVal', 'partner');
      });
    });
  }

};

export default chart;
