/* global window */
/*
 * THIS FILE SETS UP a single chart for embed purposes
 * */

import $ from 'jquery';
import choropleth from './charts/choropleth';
import infoBox from './charts/infoBox';
import topExportCommodities from './charts/topExportCommodities';
import topExportMarkets from './charts/topExportMarkets';
import topImportCommodities from './charts/topImportCommodities';
import topImportMarkets from './charts/topImportMarkets';
import yearChart from './charts/yearChart';

const charts = {
  choropleth,
  infoBox,
  topExportCommodities,
  topExportMarkets,
  topImportCommodities,
  topImportMarkets,
  yearChart
};

export default {

  // Color schemes from http://colorbrewer2.org/
  // http://colorbrewer2.org/?type=sequential&scheme=YlGn&n=5
  // The number of colors will drive the scales below
  // (e.g. if you put six colors there will be six shades in the scales)
  balanceColors: ['rgb(8,104,172)', 'rgb(120,198,121)'], // import/export - blue/green
  importColors: ['rgb(240,249,232)', 'rgb(186,228,188)', 'rgb(123,204,196)', 'rgb(67,162,202)', 'rgb(8,104,172)'], // blues
  exportColors: ['rgb(255,255,204)', 'rgb(194,230,153)', 'rgb(120,198,121)', 'rgb(49,163,84)', 'rgb(0,104,55)'], // greens

  setup(filters) {
    console.log(`This is an embed of ${filters.embed}`);

    // Add a class to body to trigger CSS rules
    $('body')
      .addClass('embed')
      .addClass(`${filters.embed}Embedded`);

    $('#embedCredit').show();

    $('#embedCredit a').attr('href', window.location.href.split('&embed')[0]);

    const chart = charts[filters.embed];
    chart.colors = [this.balanceColors, this.importColors, this.exportColors];
    chart.setup();
    chart.refresh(null, filters);
  },

  hide(chartNames) {
    // Hide all except for the chart we want to show
    chartNames.forEach((chartName) => {
      $(`#${chartName}`).hide();
    });
    $('#loadingDiv').hide();
  }

};
