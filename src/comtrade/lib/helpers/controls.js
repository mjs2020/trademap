/* global window */

/*
 * THIS FILE SETS UP THE CONTROLS ON THE PAGE
 * */
import * as d3 from 'd3';

import $ from 'jquery';
import 'select2';
import data from './data';

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
        allowClear: true,
        data: data.reporterAreasSelectOptions
      })
      .on('change', controls.onFilterChange);

    // Setup the partners dropdown
    controls.$selectPartner
      .select2({
        placeholder: 'Select a partner',
        allowClear: true,
        disabled: true,
        theme: 'classic',
        width: 'resolve',
        data: data.partnerAreasSelectOptions
      })
      .on('change', controls.onFilterChange);

    // Setup the type dropdown
    controls.$selectType
      .select2({
        minimumResultsForSearch: Infinity,
        data: data.typeCodesSelectOptions,
        theme: 'classic',
        width: 'resolve',
        disabled: true
      })
      .on('change', controls.onFilterChange);

    // Setup the commodities dropdown

    controls.$selectCommodity
      .select2({
        placeholder: 'Select a commodity',
        allowClear: true,
        theme: 'classic',
        width: 'resolve',
        disabled: true,
        ajax: {
          transport(params, success, failure) {
            // Check if services or commodities are selected in
            // controls.filters and return options based on this
            let options = { text: 'undefined', results: [] };
            if (controls.filters.type === 'S') options = { text: 'services', results: data.serviceCodesSelectOptions };
            if (controls.filters.type === 'C') options = { text: 'goods', results: data.commodityCodesSelectOptions };
            const promise = new Promise(resolve => resolve(options));
            promise.then(success);
            promise.catch(failure);
          }
        }
      })
      .on('change', controls.onFilterChange);

    // Setup the year selector
    controls.$selectYear
      .select2({
        allowClear: false,
        theme: 'classic',
        width: 'resolve',
        minimumResultsForSearch: Infinity,
        disabled: true,
        data: data.yearsSelectOptions
      })
      .on('change', controls.onFilterChange);

    // ADD REPORTER<->PARTNER SWITCH BUTTON BEHAVIOUR
    $('#switchPartners').on('click', () => {
      const currentFilters = controls.getFilters();
      controls.changeFilters({
        reporter: currentFilters.partner,
        partner: currentFilters.reporter,
        year: currentFilters.year,
        flow: currentFilters.flow
      });
    });

    // ADD IMPORT/EXPORT/BALANCE BUTTON BEHAVIOURS
    controls.$flowButtons.on('click', (event) => {
      $('#flowButtons button').removeClass('btn-primary').addClass('btn-default');
      $(event.target).closest('button').removeClass('btn-default').addClass('btn-primary');
      controls.onFilterChange();
    });

    // ADD CLEARFILTERS BUTTON BEHAVIOR
    controls.$clearFilters.on('click', () => {
      $('#selectReporter, #selectPartner, #selectCommodity')
        .off('change', controls.onFilterChange)
        .val(null)
        .trigger('change')
        .on('change', controls.onFilterChange);
      controls.onFilterChange();
    });

    // ADD CONTEXTUAL MENU BEHAVIOURS
    $('#closeContextMenu').on('click', (e) => {
      e.preventDefault();
      $('#contextMenu').hide();
    });

    $('#contextMenu .setReporter').on('click', (e) => {
      e.preventDefault();
      if (!$(e.target.parentNode).hasClass('disabled')) {
        controls.changeFilters({ reporter: $(e.target).attr('data-uncode') });
      }
      $('#contextMenu').hide();
    });

    $('#contextMenu .setPartner').on('click', (e) => {
      e.preventDefault();
      if (!$(e.target.parentNode).hasClass('disabled')) {
        controls.changeFilters({ partner: $(e.target).attr('data-uncode') });
      }
      $('#contextMenu').hide();
    });
  },

  getFilters: () => {
    const newFilters = {};
    if (controls.$selectReporter.val() !== '') { newFilters.reporter = controls.$selectReporter.val(); }
    if (controls.$selectPartner.val() !== '') { newFilters.partner = controls.$selectPartner.val(); }
    if (controls.$selectType.val() !== '') { newFilters.type = controls.$selectType.val(); }
    if (controls.$selectCommodity.val() !== '') { newFilters.commodity = controls.$selectCommodity.val(); }
    if (controls.$selectYear.val() !== '') { newFilters.year = controls.$selectYear.val(); }
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
      controls.filters.type === newfilters.type &&
      controls.filters.year === newfilters.year &&
      controls.filters.flow === newfilters.flow) {
      return;
    }

    // If the type was changed then deselect the commodity (the commodity dropdown autopopulates)
    if (controls.filters.type !== newfilters.type) {
      newfilters.commodity = undefined;
      // Update placeholder
      if (newfilters.type === 'S') controls.$selectCommodity.data('select2').selection.placeholder.text = 'Select service type';
      if (newfilters.type === 'C') controls.$selectCommodity.data('select2').selection.placeholder.text = 'Select commodity';
      // Purge the displayed value in the commodity dropdown
      controls.$selectCommodity.select2('val', '');
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

  changeFilters(filters) {
    // If reporter is not currently selected nor being set, don't allow any other updates
    if (!filters.reporter && controls.$selectReporter.val() === '') {
      return;
    }

    // Update the other fields
    if (filters.reporter && filters.reporter !== controls.$selectReporter.val()) {
      controls.$selectReporter.val(filters.reporter);
    }
    if (filters.type && filters.type !== controls.$selectType.val()) {
      controls.$selectType.val(filters.type);
    }
    if (filters.commodity && filters.commodity !== controls.$selectCommodity.val()) {
      controls.$selectCommodity.val(filters.commodity);
    }
    if (filters.partner && filters.partner !== controls.$selectPartner.val()) {
      controls.$selectPartner.val(filters.partner);
    }
    if (filters.year && filters.year !== controls.$selectYear.val()) {
      // Add the current and the requested years temporarily to the list
      controls.updateYears([+controls.$selectYear.val(), filters.year]);
      controls.$selectYear.val(filters.year);
    }

    // And trigger a single change event
    controls.$selectReporter.trigger('change');
    controls.$selects.trigger('change');
  },

  initializeFilters() {
    const URLfilters = controls.decodeURL();
    if (URLfilters && URLfilters.reporter && URLfilters.type) {
      // Set the filters from the URL
      controls.changeFilters(URLfilters);
    } else {
      const today = new Date();
      const initYear = today.getMonth() < 7 ? today.getFullYear() - 2 : today.getFullYear() - 1;
      // Then initialize filters to reporter=UK, year is estimate
      // of most recent year where there is data, and type Goods
      controls.changeFilters({ reporter: 826, year: initYear, type: 'C' });
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
    queryString.split('&').forEach((param) => {
      const p = param.replace(/%20|\+/g, ' ').split('=');
      filters[decodeURIComponent(p[0])] = (p[1] ? decodeURIComponent(p[1]) : undefined);
    });
    if (filters.year) { filters.year = +filters.year; } return filters;
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

  updateYears(yearList) {
    if (yearList.length > 0) {
      const current = +controls.$selectYear.val();
      controls.$selectYear.html('');
      yearList
        .sort((a, b) => b - a)
        .forEach((d) => {
          controls.$selectYear.append(`<option value="${d}">${d}</option>`);
        });
      if (yearList.indexOf(current) >= 0) {
        controls.$selectYear.val(+current);
      } else {
        controls.$selectYear.val(d3.max(yearList)).trigger('change');
      }
    }
  },

  fadeControls(filters) {
    if (!filters.reporter) {
      $('#selectReporter, #selectPartner, #selectCommodity')
        .off('change', controls.onFilterChange)
        .val(null)
        .trigger('change')
        .on('change', controls.onFilterChange);
      $('#selectType').select2({ disabled: true });
      $('#selectCommodity').select2({ disabled: true });
      $('#selectPartner').select2({ disabled: true });
      $('#selectYear').select2({ disabled: true });
      $('#switchPartners').prop('disabled', true);
    } else {
      $('#selectType').select2('enable');
      $('#selectCommodity').select2('enable');
      $('#selectPartner').select2('enable');
      $('#selectYear').select2('enable');
      if (filters.partner && data.lookup(filters.partner, 'reporterAreas', 'id') !== 'unknown') {
        $('#switchPartners').prop('disabled', false);
      } else {
        $('#switchPartners').prop('disabled', true);
      }
    }
  },

  showElements(filters) {
    if (!filters.reporter) {
      // Empty viz: hide switch, chevrons and graphs and charts container
      $('#goToCharts, #goToMap, #flowButtons').hide();
      $('#charts').slideUp();
      $('#contextMenu .setPartner').addClass('disabled');
    } else {
      // Show switch, chevrons and graphs
      $('#goToCharts, #goToMap, #flowButtons').show();
      $('#charts').slideDown();
      $('#contextMenu .setPartner').removeClass('disabled');
    }
  },

  showError(err) {
    $('#myModalLabel').html('<span class="glyphicon glyphicon-warning-sign"></span> There was an error in querying the COMTRADE API.');
    $('#myModal .modal-body').html(err);
    $('#myModal').modal({ show: true });
  }
};

export default controls;
