/* global window */

/*
 * THIS FILE MANAGES THE CHOROPLETH
 * */
import $ from 'jquery';
import * as d3 from 'd3';
import { geoKavrayskiy7 } from 'd3-geo-projection';
import { feature } from 'topojson-client';
import data from '../data';
import worldJson from '../../../data/world-110m.json';
import gui from '../gui';
import infoBox from './infoBox';
import controls from '../controls';
import { numFormat } from '../utils';

const $chart = $('#choropleth');
const $chartTitle = $('#choroplethTitle .chartTitle');
const $partnerTypeButtons = $('#partnerTypeButtons');
const $flowButtons = $('#flowButtons');

// SVG main properties
const height = 720;
const width = 1280;
let svg;

const noDataColor = '#818181';

const resizeSvg = () => {
  svg.attr('width', $chart.width())
    .attr('height', '100%');
};

const getLegendDescriptions = (count) => {
  if (count < 4) {
    return ['Not enough data to map'];
  }
  const lines = [
    '50th to 75th percentile',
    '25th to 50th percentile',
    'Up to 25th percentile'
  ];
  if (count > 25) {
    const topPercentile = ((3 / count) * 100).toFixed(2);
    lines.unshift(
      `Top 3 - above ${topPercentile} percentile`,
      'Above 75th percentile excl. top 3'
    );
    return lines;
  }
  lines.unshift('Above 75th percentile');
  return lines;
};

const chart = {

  currentFilters: {
    flow: 2,
    partnerType: 'codealpha'
  },

  setup(callback) {
    // ADD REGION/COUNTRY behaviours
    $partnerTypeButtons.on('click', (event) => {
      $('#partnerTypeButtons button').removeClass('btn-primary').addClass('btn-default');
      $(event.target).closest('button').removeClass('btn-default').addClass('btn-primary');
      const partnerType = $partnerTypeButtons.find('.btn-primary').attr('data-value');
      this.refresh(event, Object.assign({}, chart.currentFilters, { partnerType }));
    });

    // ADD IMPORT/EXPORT/BALANCE BUTTON BEHAVIOURS
    $flowButtons.on('click', (event) => {
      $('#flowButtons button').removeClass('btn-primary').addClass('btn-default');
      $(event.target).closest('button').removeClass('btn-default').addClass('btn-primary');
      const flow = $flowButtons.find('.btn-primary').attr('data-value');
      this.refresh(event, Object.assign({}, chart.currentFilters, { flow }));
    });

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
    const path = d3.geoPath()
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
    const countries = feature(worldJson, worldJson.objects.countries).features;

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
        d3.event.preventDefault();
        controls.changeFilters({ partner: data.lookup(d.id.toString(), 'partnersByMapNumerical', 'id') });
      });

    if (callback) { callback(); }
  },

  refresh(event, filters) {
    chart.currentFilters = Object.assign({}, chart.currentFilters, filters);
    const { reporter, flow, commodity, year, partnerType } = chart.currentFilters;

    // force a resize on refresh
    resizeSvg();

    // We build queryFilter & dataFilter objects to make API queries more generic than data queries
    const queryFilter = {
      reporter,
      initiator: 'choropleth'
    };
    const dataFilter = {
      reporter,
      year,
      partnerType
    };

    let title = '';

    // CASE 1: reporter = null
    // Blank choropleth, no countries selected and no fills and no title
    if (reporter === null) {
      svg.selectAll('.country').style('fill', '#fff');
      svg.selectAll('.highlighted').classed('highlighted', false);
      $chartTitle.html('');
      return;
    }

    if (commodity === null) {
      // CASE 2&3: commodity = null
      dataFilter.commodity = 'all';
      title = [
        data.lookup(reporter, 'reporters', 'text'),
        [
          ' trade balance ',
          ' imports of goods ',
          ' exports of goods '
        ][flow],
        ' in ',
        year
      ].join('');
    } else {
      // CASE 4&5: commodity = selected
      dataFilter.commodity = commodity;
      title = [
        data.lookup(reporter, 'reporters', 'text'),
        [
          [' trade in ', data.lookup(commodity, 'commodities', 'text'), ' balance '].join(''),
          [' imports of ', data.lookup(commodity, 'commodities', 'text'), ' '].join(''),
          [' exports of ', data.lookup(commodity, 'commodities', 'text'), ' '].join('')
        ][flow],
        ' in ',
        year
      ].join('');
    }

    data.query(queryFilter, (err) => {
      if (err) { gui.showError(err); }

      $chartTitle.html(title);

      const newData = data.getData(dataFilter);
      chart.redrawMap(+flow, partnerType, newData);

      // Set download link
      $chart.find('.downloadData').unbind('click').on('click', (e) => {
        e.preventDefault();
        gui.downloadCsv(title, newData);
      });
    });
  },

  redrawMap(flow, partnerType, newData) {
    // Based on user selected flow predefine value accessor
    const flowRank = ['balanceVal', 'importRank', 'exportRank'][flow];
    const flowVal = ['balanceVal', 'importVal', 'exportVal'][flow];

    // TODO: delete?
    // Create a lookup object to access by partner and also store count
    const newDataByPartner = d3.map(newData, d => d.partner);
    const count = newData.length;

    // Create the colorScale depending on the flow
    let colorScale = d3.scaleThreshold();
    let domain;
    let range;
    if (flow === 0) {
      // If flow is balance we create a threshold scale which has only
      // two cases positive (above 0 threshold) and negative (below 0 threshold)
      colorScale.domain([0]).range([1, 0]);
    } else {
      // For import and export e have slightly different scales
      // depending on how many countries we have data for
      if (count > 25) {
        // Quartiles plus top 3
        domain = [4, count / 4, count / 2, count * 3 / 4];
        range = [4, 3, 2, 1, 0];
      }
      if (count <= 25 && count > 4) {
        // Simple quartiles
        domain = [count / 4, count / 2, (count * 3) / 4];
        range = [3, 2, 1, 0];
      }
      if (count <= 4) {
        // No scale, all countries in a single bucket
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
        const partnerId = data.lookup(d.id.toString(), 'partnersByMapNumerical', 'id');
        if (partnerId === null) return;
        const partnerRecord = newDataByPartner.get(partnerId);
        if (partnerRecord) {
          infoBox.displayHover(partnerRecord);
        }
        // Bring country path node to the front (to display border highlighting better)
        svg.selectAll('.country').sort((a, b) => (a.id === d.id) - (b.id === d.id));
      })
      .on('mouseleave', () => {
        infoBox.hideHover();
      })
      // Apply coloring
      .transition()
      .duration(1000)
      .style('fill', (d) => {
        try {
          const mapId = d.id.toString();
          // this is a lookup for the codealpha (id)
          // because only codealphas have a mapnumerical value
          const codealpha = data.lookup(mapId, 'partnersByMapNumerical', 'id');
          if (codealpha === null) throw new Error(`Could not find partnerName for map id ${d.id}`);
          let partnerRecord;
          if (partnerType === 'codealpha') {
            partnerRecord = newDataByPartner.get(codealpha);
          } else {
            const labarea = data.lookup(codealpha, 'partners', 'labarea');
            partnerRecord = newDataByPartner.get(labarea);
          }
          if (partnerRecord[flowRank] === null) throw new Error(`'Incomplete data for partner with mapId ${mapId}`);
          const bucket = colorScale(partnerRecord[flowRank]);
          return chart.colors[flow][bucket];
        } catch (err) {
          return noDataColor;
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
      .entries(newData)
      .sort((a, b) => b.key - a.key);
    chart.drawLegend(legendData, flow);
  },

  drawLegend(legendData, flow) {
    const legendSvg = d3.select('#mapLegend svg');
    const rectHeight = 30;
    const padding = 5;
    // Cut the colors array to the length of out legend
    const currentColors = chart.colors[flow].slice(0, legendData.length).reverse();
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
          return `${numFormat(legendData[i].value.min, null, 1)} - ${numFormat(legendData[i].value.max, null, 1)} (${legendData[i].value.count} partners)`;
        }
        if (+flow === 0) {
          return `${['Deficit', 'Surplus'][i]} (${legendData[i].value.count} partners)`;
        }
        return '';
      });
  }

};

export default chart;
