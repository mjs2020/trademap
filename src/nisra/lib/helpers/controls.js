/* global window */

/*
 * THIS FILE SETS UP THE CONTROLS ON THE PAGE
 * */

import $ from 'jquery';
import 'select2';
import data from './data';
import years from './../../data/years.json';

const controls = {
  // Place some common jQuery objects so that we don't need to look for them each time.
  $selectReporter: $('#selectReporter'),
  $selectPartner: $('#selectPartner'),
  $selectType: $('#selectType'),
  $selectCommodity: $('#selectCommodity'),
  $selectYear: $('#selectYear'),
  $selects: $('#selectReporter, #selectPartner, #selectType, #selectCommodity, #selectYear'),
  $flowButtons: $('#flowButtons'),
  $clearFilters: $('#clearFilters'),

  filters: {},

  setup() {
    // Display the navBar (which is otherwise hidden)
    $('#navbar').show();
    // SETUP SELECT2 DROPDOWN SELECTORS
    // Setup the reporters dropdown
    controls.$selectReporter
      .select2({
        placeholder: 'Select a reporter',
        theme: 'classic',
        width: 'resolve',
        allowClear: false,
        templateSelection: opt => $(`<span><strong>Reporter:</strong> ${opt.text}</span>`),
        data: data.reporters
      })
      .on('change', controls.onFilterChange);

    // Setup the partners dropdown
    controls.$selectPartner
      .select2({
        placeholder: 'Select a partner',
        theme: 'classic',
        width: 'resolve',
        allowClear: true,
        templateSelection: opt => $(`<span><strong>Partner:</strong> ${opt.text}</span>`),
        data: data.partners,
        disabled: true
      })
      .on('change', controls.onFilterChange);

    // Setup the commodities dropdown
    controls.$selectCommodity
      .select2({
        placeholder: 'Select a commodity',
        theme: 'classic',
        width: 'resolve',
        allowClear: true,
        templateSelection: opt => $(`<span><strong>Commodity:</strong> ${opt.text}</span>`),
        data: data.commodities,
        disabled: false
      })
      .on('change', controls.onFilterChange);

    // Setup the year selector
    controls.$selectYear
      .select2({
        theme: 'classic',
        width: 'resolve',
        allowClear: false,
        data: data.years,
        disabled: true
      })
      .on('change', controls.onFilterChange);

    // ADD IMPORT/EXPORT/BALANCE BUTTON BEHAVIOURS
    controls.$flowButtons.on('click', (event) => {
      $('#flowButtons button').removeClass('btn-primary').addClass('btn-default');
      $(event.target).closest('button').removeClass('btn-default').addClass('btn-primary');
      controls.onFilterChange();
    });

    // ADD CLEARFILTERS BUTTON BEHAVIOR
    controls.$clearFilters.on('click', () => {
      $('#selectPartner, #selectCommodity')
        .off('change', controls.onFilterChange)
        .val(null)
        .trigger('change')
        .on('change', controls.onFilterChange);
      controls.onFilterChange();
    });
  },

  getFilters: () => {
    const newFilters = {};
    if (controls.$selectReporter.val() !== '') { newFilters.reporter = controls.$selectReporter.val(); }
    if (controls.$selectPartner.val() !== '') { newFilters.partner = controls.$selectPartner.val(); }
    if (controls.$selectCommodity.val() !== '') { newFilters.commodity = controls.$selectCommodity.val(); }
    if (controls.$selectYear.val() !== '') { newFilters.year = +controls.$selectYear.val(); }
    if ($('#flowButtons .btn-primary').attr('data-value') !== '') { newFilters.flow = $('#flowButtons .btn-primary').attr('data-value'); }
    return newFilters;
  },

  onFilterChange() {
    // Get new values
    const newfilters = controls.getFilters();

    // If there's no change from previous filters then do nothing
    if (controls.filters.reporter === newfilters.reporter &&
      controls.filters.partner === newfilters.partner &&
      controls.filters.commodity === newfilters.commodity &&
      controls.filters.year === newfilters.year &&
      controls.filters.flow === newfilters.flow) {
      return;
    }

    // If partner was unselected and is now selected then scroll down to the charts.
    if (!controls.filters.partner && !!parseInt(newfilters.partner, 10)) {
      $('html, body').animate({
        scrollTop: $('#charts').offset().top
      }, 2000);
    }

    // Activate/deactivate controls appropriately
    controls.fadeControls(newfilters);

    // Show/hide elements on page according to filters
    controls.showElements(newfilters);

    // Trigger refresh on each chart passing along the new filters
    $('.chart').trigger('refreshFilters', newfilters);

    // Update URL
    controls.updateURL(newfilters);

    // And finally store the filters
    controls.filters = newfilters;
  },

  changeFilters(newFilters) {
    // If reporter is not currently selected nor being set, don't allow any other updates
    if (!newFilters.reporter && controls.$selectReporter.val() === '') {
      return;
    }

    // Update the other fields
    if (newFilters.reporter && newFilters.reporter !== controls.$selectReporter.val()) {
      controls.$selectReporter.val(newFilters.reporter);
    }
    if (newFilters.partner && newFilters.partner !== controls.$selectPartner.val()) {
      controls.$selectPartner.val(newFilters.partner === 'all' ? '' : newFilters.partner);
    }
    if (newFilters.commodity && newFilters.commodity !== controls.$selectCommodity.val()) {
      controls.$selectCommodity.val(newFilters.commodity === 'all' ? '' : newFilters.commodity);
    }
    if (newFilters.year && newFilters.year !== controls.$selectYear.val()) {
      // Add the current and the requested years temporarily to the list
      controls.$selectYear.val(newFilters.year);
    }

    // And trigger a single change event
    controls.$selectReporter.trigger('change');
    controls.$selects.trigger('change');
  },

  initializeFilters() {
    const URLfilters = controls.decodeURL();
    if (URLfilters && URLfilters.reporter) {
      // Set the filters from the URL
      controls.changeFilters(URLfilters);
    } else {
      // use latest available year
      const initYear = years.reduce((acc, curr) => Math.max(acc, +curr.id), 2016);
      // Then initialize filters to reporter=NI, and latest year available
      controls.changeFilters({
        reporter: 'NI',
        year: initYear,
        partner: 'all',
        commodity: 'all'
      });
    }
  },

  decodeURL() {
    let queryString;
    const filters = {};
    try {
      const state = window.history.getState();
      [, queryString] = state.hash.split('?', 2);
    } catch (err) {
      queryString = window.location.search.substring(1);
    }
    queryString.split('&').forEach((pair) => {
      const [paramName, paramValue] = pair.replace(/%20|\+/g, ' ').split('=');
      filters[decodeURIComponent(paramName)] = paramValue !== '' ? decodeURIComponent(paramValue) : null;
    });
    if (filters.year) { filters.year = +filters.year; }
    return filters;
  },

  updateURL(filters) {
    let query = '?';
    Object.keys(filters).forEach((prop) => {
      query += encodeURIComponent(prop);
      if (filters[prop]) {
        query += `=${encodeURIComponent(filters[prop])}`;
      }
      query += '&';
    });
    query = query.slice(0, -1);
    window.history.replaceState(null, 'International Trade in Goods and Services by Country and Commodity', query);
  },

  fadeControls(filters) {
    if (!filters.reporter) {
      $('#selectReporter, #selectPartner, #selectCommodity')
        .off('change', controls.onFilterChange)
        .val(null)
        .trigger('change')
        .on('change', controls.onFilterChange);
      $('#selectCommodity').prop('disabled', true);
      $('#selectPartner').prop('disabled', true);
      $('#selectYear').prop('disabled', true);
    } else {
      $('#selectCommodity').prop('disabled', false);
      $('#selectPartner').prop('disabled', false);
      $('#selectYear').prop('disabled', false);
    }
  },

  showElements(filters) {
    if (!filters.reporter) {
      // Empty viz: hide switch, chevrons and graphs and charts container
      $('#goToCharts, #goToMap, #flowButtons').hide();
      $('#charts').slideUp();
    } else {
      // Show switch, chevrons and graphs
      $('#goToCharts, #goToMap, #flowButtons').show();
      $('#charts').slideDown();
    }
  },

  showError(err) {
    $('#myModalLabel').html('<span class="glyphicon glyphicon-warning-sign"></span> There was an error in querying the COMTRADE API.');
    $('#myModal .modal-body').html(err);
    $('#myModal').modal({ show: true });
  }
};

export default controls;
