/* global document window */
/* eslint object-curly-newline: 0 */
/*
 * THIS FILE SETS UP THE information box
 * */
import $ from 'jquery';

import data from '../data';
import gui from '../gui';
import { numFormat, numOrdinal } from '../utils';

const $infoBox = $('#infoBox');
const $defaultPanel = $('#defaultPanel');
const $hoverPanel = $('#hoverPanel');

const bottomMargin = 10;

const getPositionFromTop = () => {
  if ($(document).width() > 992) {
    return `${Math.min(
      $('#infoBoxPlaceholder').offset().top,
      $(window).height() - $infoBox.height() - bottomMargin + $(window).scrollTop()
    )}px`;
  }
  return $('#infoBoxPlaceholder').offset().top;
};

const getWidth = () => `${$('#infoBoxPlaceholder').width() - 20}px`;

const repositionBox = () => {
  $infoBox
    .css({
      top: getPositionFromTop(),
      width: getWidth()
    });
};

const box = {

  setup() {
    // Display and position the infoBox (which is otherwise hidden)
    $infoBox
      .show()
      .css({
        top: $(window).height() - $infoBox.height() - bottomMargin + $(window).scrollTop(),
        width: getWidth()
      });

    // Bind to the scroll event and move the box
    $(window).scroll(repositionBox);

    // Initialize the position of the hoverPanel
    $hoverPanel.slideUp();

    // Bind to window.resize for responsive behaviour
    $(window).on('resize', repositionBox);

    // Set a timeout and call a reposition to ensure positioning on first load
    setTimeout(repositionBox, 800);

    // Bind the refresh function to the refreshFilters event
    $infoBox.on('refreshFilters', box.refresh);
  },


  refresh(event, filters) {
    const { reporter, partner, commodity, year } = filters;

    // CASE 1: reporter = null
    if (
      reporter === null
    ) return $infoBox.slideUp();

    $infoBox.slideDown();

    // We build queryFilter & dataFilter objects to make API queries more generic than data queries
    const queryFilter = {
      reporter,
      initiator: 'infoBox'
    };
    const dataFilter = {
      reporter,
      year,
      partner,
      commodity
    };

    // CASE 2: commodity = null        partner = null
    // CASE 3: commodity = null        partner = selected
    // CASE 4: commodity = selected    partner = selected
    // CASE 5: commodity = selected    partner = null
    if (partner === null) {
      dataFilter.partner = 'all';
    }

    if (commodity === null) {
      dataFilter.commodity = 'all';
    }

    return data.query(queryFilter, (err) => {
      if (err) { gui.showError(err); }

      const newData = data.getData(dataFilter);
      if (newData.length > 1) throw new Error('Infobox retrived more than one record. Used %o filter and got %d results: %o', dataFilter, newData.length, newData);
      box.populateBox($defaultPanel, newData[0], partner);
    });
  },


  populateBox($panel, record) {
    const {
      year, reporter, partner, commodity,
      importVal, exportVal, balanceVal, bilateralVal,
      importRank = null, exportRank = null,
      importPc = null, exportPc = null
    } = record;
    // Clear data previously in box
    $panel.find('.subtitle, .value, .ranking').html('');
    $panel.find('dt').show();

    // If no details then display no data and stop.
    if (!record) {
      $panel.find('.subtitle').html(`<p class="text-center"><strong>No data available for ${data.lookup(partner, 'partners', 'text')}.</strong></p>`);
      $panel.find('.value, .ranking').html('');
      $panel.find('dt').hide();
      return;
    }

    const reporterName = data.lookup(reporter, 'reporters', 'text');
    const partnerName = partner !== 'all' ? data.lookup(partner, 'partners', 'text') : 'the world';
    const commodityName = commodity !== 'all' ? data.lookup(commodity, 'commodities', 'text') : 'goods';
    const subtitle = `<strong>${reporterName}</strong> trade of <strong>${commodityName}</strong> with <strong>${partnerName}</strong> in <strong>${year}</strong><br />`;
    $panel.find('.subtitle').html(subtitle);

    // Populate panel
    $panel.find('.value.exports').html(numFormat(exportVal, null, 1));
    $panel.find('.value.imports').html(numFormat(importVal, null, 1));
    $panel.find('.value.balance').html(numFormat(balanceVal, null, 1));
    $panel.find('.value.bilateral').html(numFormat(bilateralVal, null, 1));

    // Show ranking only if partner and rankings are given
    if (partner !== 'all' && importRank !== null && exportRank !== null) {
      const rankingText = [
        `${partnerName} was the ${numOrdinal(exportRank)} largest export market for ${reporterName} `,
        `(${exportPc.toFixed(1)}% of ${reporterName} exports) `,
        `and the ${numOrdinal(importRank)} largest import market for ${reporterName} `,
        `(${importPc.toFixed(1)}% of ${reporterName} imports) `,
        `for ${commodityName} `,
        `in ${year}.`
      ].join('');
      $panel.find('.ranking').html(rankingText);
    }
  },

  displayHover(record) {
    box.populateBox($hoverPanel, record);
    // Animate display of hover panel
    $defaultPanel.stop().slideUp();
    $hoverPanel.stop().slideDown();
  },

  hideHover() {
    // Animate display of default panel
    $hoverPanel.stop().slideUp();
    $defaultPanel.stop().slideDown();
  }


};

export default box;
