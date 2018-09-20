/* global document */

/*
 * THIS FILE SETS UP EACH OF THE CHARTS
 */
import * as d3 from 'd3';

import choropleth from './charts/choropleth';
import yearChart from './charts/yearChart';
import infoBox from './charts/infoBox';
import topExportCommodities from './charts/topExportCommodities';
import topExportMarkets from './charts/topExportMarkets';
import topImportCommodities from './charts/topImportCommodities';
import topImportMarkets from './charts/topImportMarkets';

export default {

  // Color schemes from http://colorbrewer2.org/
  // http://colorbrewer2.org/?type=sequential&scheme=YlGn&n=5
  // The number of colors will drive the scales below (e.g. if you put
  // six colors there will be six shades in the scales)
  balanceColors: ['rgb(8,104,172)', 'rgb(120,198,121)'], // import/export - blue/green
  importColors: ['rgb(240,249,232)', 'rgb(186,228,188)', 'rgb(123,204,196)', 'rgb(67,162,202)', 'rgb(8,104,172)'], // blues
  exportColors: ['rgb(255,255,204)', 'rgb(194,230,153)', 'rgb(120,198,121)', 'rgb(49,163,84)', 'rgb(0,104,55)'], // greens

  setup(callback) {
    this.colors = [this.balanceColors, this.importColors, this.exportColors];

    // Apply colors
    choropleth.colors = this.colors;
    yearChart.colors = this.colors;
    topExportCommodities.colors = this.colors;
    topExportMarkets.colors = this.colors;
    topImportCommodities.colors = this.colors;
    topImportMarkets.colors = this.colors;

    // Setup charts
    yearChart.setup();
    infoBox.setup();
    topExportCommodities.setup();
    topExportMarkets.setup();
    topImportCommodities.setup();
    topImportMarkets.setup();
    choropleth.setup(() => {
      const css = this.getCssForSVGs();
      this.injectCSSintoSVG(css, d3.selectAll('svg'));
      callback();
    });
  },

  getCssForSVGs() {
    let cssText = '';
    // Iterate through stylesheets and look for main.svg.css
    for (let i = 0; i < document.styleSheets.length; i++) {
      if (document.styleSheets[i].href && document.styleSheets[i].href.indexOf('main.svg.css') >= 0) {
        // Add rules from stylesheet to our cssText
        for (let j = 0; j < document.styleSheets[i].cssRules.length; j++) {
          cssText += `${document.styleSheets[i].cssRules[j].cssText} `;
        }
      }
    }
    return cssText;
  },

  injectCSSintoSVG(css, svg) {
    svg
      .insert('defs', ':first-child')
      .append('style')
      .attr('type', 'text/css')
      .text(css);
  }

};
