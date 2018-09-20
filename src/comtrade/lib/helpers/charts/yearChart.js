/* global window */
/*
 * THIS FILE SETS UP THE yearChart chart
 * */
import $ from 'jquery';
import * as d3 from 'd3';
import d3Tip from 'd3-tip';

import data from '../data';
import gui from '../gui';
import controls from '../controls';

d3.tip = d3Tip;

const $container = $('#yearChart');
const $chart = $container.children('.chart');
const $chartTitle = $container.children('.chartTitle');

// SVG main properties
const svg = d3.select('#yearChart .chart')
  .append('svg')
  .attr('xmlns', 'http://www.w3.org/2000/svg')
  .attr('version', 1.1)
  .classed('svgChart', true);
const margin = {
  top: 25, right: 15, bottom: 75, left: 70
};
let height = $chart.height();
let width = $chart.width();
let innerHeight = height - margin.top - margin.bottom;
let innerWidth = width - margin.left - margin.right;

// Chart main objects
const xScale = d3.scaleLinear().range([0, innerWidth]).clamp(true);
const yScale = d3.scaleLinear().range([innerHeight, 0]);
const xAxis = d3.axisBottom(xScale)
  .tickFormat(d3.format('.0f'));
const yAxis = d3.axisLeft(yScale)
  .ticks(6)
  .tickFormat(data.numFormat);
const line = d3.line()
  .curve(d3.curveLinear);

const chart = {

  setup() {
    // Bind the refresh function to the refreshFilters event
    $chart.on('refreshFilters', chart.refresh);

    // Bind the resize function to the window resize event
    $(window).on('resize', chart.resizeSvg);
    // Setup SVG and add axises and groups
    svg.attr('width', width)
      .attr('height', height);
    svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(${margin.left},${margin.top + innerHeight})`)
      .call(xAxis);
    svg.append('g')
      .attr('class', 'y axis')
      .attr('transform', `translate(${margin.left},${margin.top})`)
      .call(yAxis);
    svg.append('g')
      .attr('class', 'plots')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Draw legend
    const legendItems = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${innerWidth + margin.left - (chart.colors[0].length * 120)},0)`)
      .selectAll('.legendItem')
      .data(chart.colors[0])
      .enter()
      .append('g')
      .attr('class', 'legendItem');
    legendItems.append('circle')
      .attr('cx', (d, i) => i * 120)
      .attr('cy', '10')
      .attr('r', '5')
      .style('fill', d => d);
    legendItems.append('text')
      .attr('transform', (d, i) => `translate(${(i * 120) + 10},15)`)
      .text((d, i) => ['Imports', 'Exports'][i]);


    // Hide on load
    $container.slideUp(0);
  },


  refresh(event, filters) {
    // force resize on refresh
    chart.resizeSvg();

    // CASE 1: reporter = null
    if (!filters.reporter) {
      $container.slideUp();
      return;
    }

    // We build a queryFilter and a dataFilter object to make API
    // queries more generic than data queries (see case 2 and 5 below)
    const queryFilter = {
      reporter: +filters.reporter,
      year: 'all',
      initiator: 'yearChart',
      type: filters.type
    };
    let dataFilter = {
      reporter: +filters.reporter,
      year: 'all',
      type: filters.type
    };
    let title = '';

    // CASE 2: reporter = selected    commodity = null        partner = null
    if (filters.reporter && !filters.commodity && !filters.partner) {
      title = `${data.lookup(filters.reporter, 'reporterAreas', 'text')} trade in ${({ S: 'services', C: 'goods' })[filters.type]} with the world`;
      queryFilter.partner = 0;
      queryFilter.commodity = 'TOTAL';
      dataFilter = queryFilter;
    }

    // CASE 3: reporter = selected    commodity = null        partner = selected
    if (filters.reporter && !filters.commodity && filters.partner) {
      title = `${data.lookup(filters.reporter, 'reporterAreas', 'text')} trade in ${({ S: 'services', C: 'goods' })[filters.type]} with ${data.lookup(filters.partner, 'partnerAreas', 'text')}`;
      queryFilter.partner = filters.partner;
      queryFilter.commodity = 'TOTAL';
      dataFilter.partner = +filters.partner;
      dataFilter.commodity = 'TOTAL';
    }

    // CASE 4: reporter = selected    commodity = selected    partner = selected
    // NOTE This is already covered by the data in CASE 3 so we don't
    // specify the commodity in the query to avoid duplicate data
    if (filters.reporter && filters.commodity && filters.partner) {
      title = `${data.lookup(filters.reporter, 'reporterAreas', 'text')} trade in ${data.commodityName(filters.commodity, filters.type)} with ${data.lookup(filters.partner, 'partnerAreas', 'text')}`;
      queryFilter.partner = +filters.partner;
      queryFilter.commodity = filters.commodity;
      dataFilter.partner = +filters.partner;
      dataFilter.commodity = filters.commodity;
    }

    // CASE 5: reporter = selected    commodity = selected    partner = null
    if (filters.reporter && filters.commodity && !filters.partner) {
      title = `${data.lookup(filters.reporter, 'reporterAreas', 'text')} trade in ${data.commodityName(filters.commodity, filters.type)} with the world`;
      queryFilter.partner = 0;
      queryFilter.commodity = filters.commodity;
      dataFilter.partner = 0;
      dataFilter.commodity = filters.commodity;
    }

    // Run the query, display the panel and redraw the chart
    data.query(queryFilter, (err, ready) => {
      if (err) { gui.showError(err); }
      if (err || !ready) { return; }
      // Get the data, display panel and update chart
      const newData = data.getData(dataFilter);
      // Get the start year of the data and append "since" part to title.
      const startYear = d3.min(newData, d => d.year);
      title += ` since ${startYear}`;
      // Set chart title
      $chartTitle.html(title);
      // Set download link
      $container.find('.downloadData').unbind('click').on('click', (e) => {
        e.preventDefault();
        gui.downloadCsv(title, newData);
      });
      $container.slideDown(400, () => {
        chart.draw(newData);
      });
    });
  },


  draw(newData) {
    // If no data is available display a "No data available" message.
    if (newData.length === 0) {
      svg.append('text')
        .text('No data available for this chart.')
        .classed('nodata', true)
        .classed('label', true)
        .attr('x', (innerWidth / 2) + margin.left - 75)
        .attr('y', (innerHeight / 2) + margin.top - 75);
      // And remove lines and dots
      svg.selectAll('.flow').remove();
      return;
    }
    svg.selectAll('.nodata').remove();

    // Prepare data
    const nestedData = d3.nest()
      .key(d => d.flow)
      .sortValues((a, b) => a.year - b.year)
      .entries(newData);
    const yearExtent = d3.extent(newData, d => d.year);
    const yearRange = d3.range(yearExtent[0], yearExtent[1] + 1);
    const tip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(d => `${d.year}: ${data.numFormat(d.value, null, 1)} ${['imports', 'exports'][d.flow - 1]}`);

    // If there is data only for one flow direction add an empty nest.
    if (nestedData.length < 2) {
      if (+nestedData[0].key === 2) {
        nestedData.unshift({ key: 1, values: [] });
      } else {
        nestedData.push({ key: 2, values: [] });
      }
    }

    // Update scale domains with newData values and the line generation function
    xScale.domain([yearExtent[0], yearExtent[1] + 1]);
    yScale.domain([0, d3.max(newData, d => d.value)]);
    line.x(d => xScale(d.year))
      .y(d => yScale(d.value));
    xAxis.scale(xScale)
      .tickValues(yearRange)
      .tickSize(6, 0)
      .tickFormat(d3.format('.0f'));
    yAxis.scale(yScale)
      .tickSize(6, 0)
      .tickFormat(data.numFormat);

    // Update yearSelect dropdown with new year range
    controls.updateYears(yearRange);

    // Update axis
    svg.select('.x.axis') // change the x axis
      .transition()
      .call(xAxis)
      .selectAll('g.x text')
      .attr('transform', 'rotate(-65) translate(-22,-10)');
    svg.select('.y.axis') // change the y axis
      .transition()
      .call(yAxis);

    // Add line to highlight year
    const hl = svg.selectAll('line.yearHighlight')
      .data([1]);
    const selectedYear = $('#selectYear').val();
    hl.enter()
      .append('line')
      .attr('class', 'yearHighlight')
      .attr('x1', '0')
      .attr('y1', margin.top)
      .attr('x2', '0')
      .attr('y2', margin.top + innerHeight)
      .attr('stroke', '#054D82')
      .attr('stroke-dasharray', '5, 5')
      .attr('stroke-width', '1');
    hl.transition()
      .attr('x1', () => xScale(+selectedYear) + margin.left)
      .attr('x2', () => xScale(+selectedYear) + margin.left);
    // TODO Highlight dots for year
    // TODO Highlight xAxis label


    // Draw groups and then in each group lines and dots
    const plotGraph = svg.select('.plots');
    const lines = plotGraph.selectAll('path.flow')
      .data(nestedData);
    // Add lines
    lines.enter()
      .append('path')
      .attr('class', 'flow')
      .style('stroke', d => chart.colors[0][d.key - 1])
      .style('fill', 'none')
      .style('stroke-width', '1.5px')
      .merge(lines)
      .transition()
      .attr('d', d => line(d.values));

    // Add dots in groups
    const dotGroups = plotGraph.selectAll('g.flow')
      .data(nestedData);
    dotGroups.enter()
      .append('g')
      .attr('class', 'flow');
    dotGroups.exit().remove();
    const dots = plotGraph.selectAll('g.flow').selectAll('circle.dot')
      .data(d => d.values);

    dots.enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('r', '3')
      .attr('cx', d => xScale(d.year))
      .attr('cy', d => yScale(d.value))
      .style('fill', d => chart.colors[0][d.flow - 1])
      .style('stroke-width', '0')
      .on('mouseover', (d) => {
        tip.show(d);
        d3.select(this).interrupt().transition().attr('r', '6');
      })
      .on('mouseout', (d) => {
        tip.hide(d);
        d3.select(this).interrupt().transition().attr('r', '3');
      })
      .on('click', (d) => {
        controls.changeFilters({ year: d.year });
      });
    // Transition dot positions
    dots.transition()
      .attr('cx', d => xScale(d.year))
      .attr('cy', d => yScale(d.value));

    // Remove unneeded dots
    dots.exit().remove();

    // Add tooltip
    plotGraph.call(tip);
  },


  resizeSvg() {
    // Get new size & set new size to svg element
    width = $chart.width() || $container.width();
    height = $chart.height();
    svg.attr('width', width)
      .attr('height', height);
    // Update scales
    innerWidth = width - margin.left - margin.right;
    innerHeight = height - margin.top - margin.bottom;
    xScale.range([0, innerWidth]);
    yScale.range([innerHeight, 0]);
    xAxis.scale(xScale);
    yAxis.scale(yScale);
    // Redraw axises
    svg.select('.x.axis') // change the x axis
      .transition()
      .attr('transform', `translate(${margin.left},${margin.top + innerHeight})`)
      .call(xAxis);
    svg.select('.y.axis') // change the x axis
      .transition()
      .call(yAxis);
    // Move legend
    svg.select('g.legend')
      .attr('transform', `translate(${innerWidth + margin.left - (chart.colors[0].length * 120)},0)`);
    // Move dots
    svg.selectAll('circle.dot')
      .transition()
      .attr('cx', d => xScale(d.year))
      .attr('cy', d => yScale(d.value));
    // Update line paths
    line.x(d => xScale(d.year));
    line.y(d => yScale(d.value));
    svg.selectAll('path.flow')
      .transition()
      .attr('d', d => line(d.values));
    // Move highlight
    const selectedYear = $('#selectYear').val();
    svg.selectAll('line.yearHighlight')
      .transition()
      .attr('x1', () => xScale(+selectedYear) + margin.left)
      .attr('x2', () => xScale(+selectedYear) + margin.left);
  }
};

export default chart;
