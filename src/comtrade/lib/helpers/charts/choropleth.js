/* global window */

/*
 * THIS FILE MANAGES THE CHOROPLETH
 * */
import $ from 'jquery';
import * as d3 from 'd3';
import { geoPath } from 'd3-geo';
import { geoKavrayskiy7 } from 'd3-geo-projection';
import { feature } from 'topojson-client';
import data from '../data';
import gui from '../gui';
import infoBox from './infoBox';

const $chart = $('#choropleth');
const $chartTitle = $('#choroplethTitle .chartTitle');

// SVG main properties
const height = 720;
const width = 1280;
let svg;

function resizeSvg() {
  svg.attr('width', $chart.width())
    .attr('height', '100%');
}

const chart = {
  setup(callback) {
    svg = d3.select('#choropleth .chart')
      .append('svg')
      .classed('choropleth', true)
      .classed('svgChart', true)
      .attr('version', 1.1)
      .attr('xmlns', 'http://www.w3.org/2000/svg')
      .attr('id', 'choroplethSvg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Display the choropleth (which is otherwise hidden)
    $chart.show();

    // Bind the refresh function to the refreshFilters event
    $chart.on('refreshFilters', chart.refresh);

    // Some utility functions:
    const projection = geoKavrayskiy7()
      .scale(230)
      .translate([(width / 2), (height / 2)])
      .precision(0.1);
    const path = geoPath()
      .projection(projection);

    // Sized the SVG and bind the resize function to the
    // window resize event to make the map responsive
    d3.select(window).on('resize', resizeSvg);
    resizeSvg();

    // Define sphere boundary
    svg.append('defs').append('path')
      .datum({ type: 'Sphere' })
      .attr('id', 'sphere')
      .attr('d', path)
      .attr('stroke', '#054D82')
      .attr('stroke-width', '1.5px')
      .attr('fill', 'none');
    svg.append('use')
      .attr('class', 'stroke')
      .attr('xlink:href', '#sphere');
    svg.append('use')
      .attr('class', 'fill')
      .attr('xlink:href', '#sphere');

    // Genereate an array of countries with geometry and
    // IDs (IDs are according to ISO_3166-1_numeric numbering)
    const countries = feature(data.worldJson, data.worldJson.objects.countries).features;

    // We place all countries inside a g.countries
    svg.append('g')
      .attr('class', 'countries')
      // Bind country data to path.country
      .selectAll('.country')
      .data(countries)
      .enter()
      .append('path')
      .attr('class', 'country')
      .attr('d', path)
      .attr('id', d => `iso${d.id}`)
      .on('click', (d) => {
        // Show context menu
        d3.event.preventDefault();
        $('#contextMenu .country').html(data.lookup(d.id, 'countryByISONum', 'name'));
        $('#contextMenu .setReporter a, #contextMenu .setPartner a').attr('data-uncode', data.lookup(d.id, 'countryByISONum', 'unCode'));
        $('#closeContextMenu').on('click', (e) => {
          e.preventDefault();
          infoBox.hideHover();
        });
        $('#contextMenu').css({
          display: 'block',
          left: d3.event.pageX,
          top: d3.event.pageY
        });
      });

    if (callback) { callback(); }
  },

  refresh(event, filters) {
    // force a resize on refresh
    resizeSvg();

    const queryFilter = {
      reporter: +filters.reporter,
      partner: 'all',
      year: +filters.year,
      initiator: 'choropleth'
    };
    const dataFilter = {
      reporter: +filters.reporter,
      partner: 'all',
      year: +filters.year,
      flow: +filters.flow
    };
    let title = '';

    // CASE 1: reporter = null
    // Blank choropleth, no countries selected and no fills and no title
    if (!filters.reporter) {
      svg.selectAll('.country').style('fill', '#fff');
      svg.selectAll('.highlighted').classed('highlighted', false);
      $chartTitle.html('');
      return;
    }

    // CASE 2&3: reporter = selected    commodity = null
    if (filters.reporter && !filters.commodity) {
      // Set query and data retrieval filters (forcing commodity to total)
      queryFilter.commodity = 'TOTAL';
      queryFilter.type = filters.type;
      dataFilter.commodity = 'TOTAL';
      dataFilter.type = filters.type;
      title = '';
      title = [
        data.lookup(filters.reporter, 'countryByUnNum', 'name'),
        [
          [' trade in ', ({ S: 'services', C: 'goods' })[filters.type], ' balance '].join(''),
          [' imports of ', ({ S: 'services', C: 'goods' })[filters.type], ' '].join(''),
          [' exports of ', ({ S: 'services', C: 'goods' })[filters.type], ' '].join('')
        ][filters.flow],
        ' in ',
        filters.year
      ].join('');
    }

    // CASE 4&5: reporter = selected    commodity = selected
    if (filters.reporter && filters.commodity) {
      // Set query and data retrieval filters
      queryFilter.commodity = filters.commodity;
      queryFilter.type = filters.type;
      dataFilter.commodity = filters.commodity;
      dataFilter.type = filters.type;
      title = [
        data.lookup(filters.reporter, 'countryByUnNum', 'name'),
        [
          [' trade in ', data.commodityName(filters.commodity, filters.type), ' balance '].join(),
          [' imports of ', data.commodityName(filters.commodity, filters.type), ' '].join(),
          [' exports of ', data.commodityName(filters.commodity, filters.type), ' '].join()
        ][filters.flow],
        ' in ',
        filters.year
      ].join();
    }

    data.query(queryFilter, (err, ready) => {
      if (err) { gui.showError(err); }
      if (err || !ready) { return; }
      // Redraw map and set title
      chart.redrawMap(dataFilter);
      // Set chart title
      $chartTitle.html(title);
      const newData = data.getData(dataFilter);
      // Set download link
      $chart.find('.downloadData').unbind('click').on('click', (e) => {
        e.preventDefault();
        gui.downloadCsv(title, newData);
      });
    });
  },

  redrawMap(filters) {
    // Based on user selected flow predefine value accessor
    let flowRank;
    let flowVal;
    if (+filters.flow === 1) { flowRank = 'importRank'; flowVal = 'importVal'; }
    if (+filters.flow === 2) { flowRank = 'exportRank'; flowVal = 'exportVal'; }
    if (+filters.flow === 0) { flowRank = 'balanceVal'; flowVal = 'balanceVal'; }

    // Get the relevant data for both flows and then combine the data
    let newData = data.getData({
      reporter: filters.reporter,
      type: filters.type,
      commodity: filters.commodity,
      year: +filters.year
    });
    newData = data.combineData(newData);

    // Filter out records that relate to partner: 0 (world) which would distort the scale
    // as well as records that don't have data for the current flow
    newData = newData.filter(d => d[flowRank] && d[flowVal] && d.partner !== 0);

    // Create a lookup object to access by partner and also store count
    const newDataByPartner = d3.map(newData, d => d.partner);
    const count = newData.length;

    // Create the colorScale depending on the flow
    let colorScale = d3.scaleThreshold();
    let domain;
    let range;
    if (+filters.flow === 0) {
      // If flow is balance we create a threshold scale which has only
      // two cases positive (above 0 threshold) and negative (below 0 threshold)
      colorScale.domain([0]).range([0, 1]);
    } else {
      // For import and export e have slightly different scales
      // depending on how many countries we have data for
      if (count > 25) { // Quartiles plus top 3
        domain = [4, count / 4, count / 2, (count * 3) / 4];
        range = [4, 3, 2, 1, 0];
      }
      if (count <= 25 && count > 4) { // Simple quartiles
        domain = [count / 4, count / 2, (count * 3) / 4];
        range = [3, 2, 1, 0];
      }
      if (count <= 4) { // No scale, all countries in a single bucket
        domain = [count];
        range = [0];
      }
      colorScale = d3.scaleThreshold().domain(domain).range(range);
    }

    // Color the paths on the choropleth
    svg.selectAll('.country')
      .classed('highlighted', false)
      // Assign behaviours to hover over country
      .on('mouseenter', (d) => {
        try {
          const partner = data.countryByISONumMap.get(d.id).unCode;
          const partnerDetails = newDataByPartner.get(partner);
          if (partnerDetails) {
            infoBox.displayHover(partnerDetails);
          } else {
            // DisplayHover with no data but include country name
            infoBox.displayHover(false, partner);
          }
          // Bring country path node to the front (to display border highlighting better)
          svg.selectAll('.country').sort((a, b) => (a.id === d.id) - (b.id === d.id));
        } catch (err) {
          // DisplayHover with no data
          infoBox.displayHover(false);
          console.log(`No country in database by ${d.id} isoCode.`);
        }
      })
      .on('mouseleave', () => {
        infoBox.hideHover();
      })
      // Apply coloring
      .transition()
      .duration(1000)
      .style('fill', (d) => {
        const unCodes = data.areasByISONum(d.id);
        const countryData = [];
        let bucket = 0;
        try {
          unCodes.forEach((el) => {
            const datum = newDataByPartner.get(el.unCode);
            if (datum) { countryData.push(newDataByPartner.get(el.unCode)); }
          });
          if (countryData.length === 0) { throw new Error(`No data points for ${data.lookup(d.id, 'countryByUnNum', 'name')}`); }
          if (countryData.length > 1) { throw new Error(`Multiple data points for ${data.lookup(d.id, 'countryByUnNum', 'name')}`); }
          if (countryData[0][flowRank] === null) { throw new Error(`'Incomplete data for ${data.lookup(d.id, 'countryByUnNum', 'name')}`); }
          bucket = colorScale(countryData[0][flowRank]);
          return chart.colors[filters.flow][bucket];
        } catch (exception) {
          return '#818181';
        }
      });

    // Prepare data for the legend and (Re)draw it
    const legendData = d3.nest()
      .key(d => colorScale(d[flowRank]))
      .rollup(values => ({
        min: d3.min(values, v => v[flowVal]),
        max: d3.max(values, v => v[flowVal]),
        count: values.length
      }))
      .entries(newData);
    chart.drawLegend(legendData, filters.flow);

    // Highlight reporter on map
    svg.select(`#iso${data.lookup(filters.reporter, 'countryByUnNum', 'isoNumerical')}`).classed('highlighted', true);
  },

  drawLegend(legendData, flow) {
    const legendSvg = d3.select('#mapLegend svg');
    const rectHeight = 30;
    const padding = 5;
    // Cut the colors array to the length of out legend
    const currentColors = chart.colors[flow].slice(0, legendData.length);
    const flowName = ['Balance', 'Imports', 'Exports'][flow];
    const totalPartners = legendData.reduce(((prev, curr) => prev + curr.value.count), 0);

    legendSvg
      .attr('height', ((legendData.length + 1) * (rectHeight + padding)) + 25)
      .attr('width', 225);

    // Remove legend & title if present
    legendSvg.select('g.legend').remove();
    legendSvg.select('text.title').remove();

    // Make title
    legendSvg.append('text')
      .attr('class', 'title')
      .attr('x', 0)
      .attr('y', 18)
      .style('font-weight', 'bold')
      .text(`${flowName} Legend`);

    // Redraw legend
    let legend = legendSvg.append('g')
      .attr('class', 'legend')
      .attr('transform', 'translate(0,25)');
    // Add no-data box & label
    legend.append('rect')
      .attr('class', 'noData')
      .attr('x', 0)
      .attr('y', 0)
      .attr('rx', 1)
      .attr('ry', 1)
      .attr('width', 8)
      .attr('height', 15)
      .style('fill', '#818181');
    legend.append('text')
      .attr('class', 'noData')
      .attr('x', 12)
      .attr('y', 13)
      .text('No data available');
    // Add scale boxes
    legend = legend.append('g')
      .attr('class', 'scale')
      .attr('transform', 'translate(0,18)');
    legend.selectAll('rect')
      .data(d3.range(currentColors.length))
      .enter()
      .append('rect')
      .attr('x', 0)
      .attr('y', (d, i) => i * 33)
      .attr('rx', 1)
      .attr('ry', 1)
      .attr('width', 8)
      .attr('height', 30)
      .style('fill', (d, i) => currentColors[i]);
    // Add text
    const texts = legend.selectAll('text')
      .data(d3.range(currentColors.length))
      .enter()
      .append('text')
      .attr('y', (d, i) => (i * 33) + 14);
    texts.append('tspan')
      .attr('class', 'line1')
      .attr('x', 12)
      .text((d, i) => {
        if (+flow > 0) {
          return `${data.numFormat(legendData[i].value.min, null, 1)} - ${data.numFormat(legendData[i].value.max, null, 1)} (${legendData[i].value.count} partners)`;
        }
        return '';
      });
    texts.append('tspan')
      .attr('class', 'line1')
      .attr('x', 12)
      .attr('dy', 15)
      .text((d, i) => {
        if (+flow === 0) {
          return `${['Deficit', 'Surplus'][i]} (${legendData[i].value.count} partners)`;
        }
        let returnTxt = '';
        const topPercentile = (3 / totalPartners) * 100;
        switch (i) {
          case 0:
            if (totalPartners <= 4) {
              returnTxt = 'Not enough data to map';
            } else {
              returnTxt = 'Up to 25th percentile';
            }
            break;
          case 1:
            returnTxt = '25th to 50th percentile';
            break;
          case 2:
            returnTxt = '50th to 75th percentile';
            break;
          case 3:
            returnTxt = 'Above 75th percentile excl. top 3';
            break;
          case 4:
            returnTxt = `Top 3 - above ${topPercentile.toFixed(1)} percentile`;
            break;
          default:
            throw new Error('Could not find percentile');
        }
        return returnTxt;
      });
  }
};

export default chart;
