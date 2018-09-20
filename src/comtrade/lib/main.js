import $ from 'jquery';
import Modernizr from 'modernizr';

// trademap requirements
import gui from './helpers/gui';
import controls from './helpers/controls';
import charts from './helpers/charts';
import embed from './helpers/embed';
import intro from './helpers/intro';

export default function () {
  // Use Modernizr to check for SVG support and if not present display
  // an error and don't even start loading CSV and setting up charts
  if (!Modernizr.svg) {
    $('#userAlert').removeClass('hidden');
    $('#userAlert .message').html('Error: it looks like your browser does not support SVG which is required for this visualization. Please consider updating to a more recent browser.');
    $('#loadingDiv').hide();
    return;
  }

  // Use Modernizr to check for CORS support and if not present display an error
  // and don't even start loading CSV and setting up charts
  if (!Modernizr.cors) {
    $('#userAlert').removeClass('hidden');
    $('#userAlert .message').html('<strong>Warning</strong>: This application may not work correctly. Your browser does not support querying APIs which is necessary for this application to work. (Missing <a href="https://en.wikipedia.org/wiki/Cross-origin_resource_sharing">CORS</a>).<br /> Please try using a recent version of Firefox or Chrome.');
    $('#loadingDiv').hide();
  }

  // Check if we have an embed parameter like "embed=yearChart".
  const urlParameters = controls.decodeURL();
  const chartNames = ['choropleth', 'yearChart', 'topImportCommodities', 'topExportCommodities', 'topImportMarkets', 'topExportMarkets'];
  if (urlParameters.embed && chartNames.indexOf(urlParameters.embed) > -1) {
    // If we do, then hide all other charts and call the embed setup and skip the rest
    chartNames.splice(chartNames.indexOf(urlParameters.embed), 1);
    embed.hide(chartNames);
    embed.setup(urlParameters);
    return;
  }

  // Setup the gui
  gui.setup();

  // Setup intro (which will internally check if it should be displayed)
  intro.setup(urlParameters);

  // Setup the controls
  controls.setup();

  // Setup charts
  charts.setup(() => {
    controls.initializeFilters();
  });
}
