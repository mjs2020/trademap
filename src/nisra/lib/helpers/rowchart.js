/*
 * THIS FILE PROVIDES LOGIC TO SETUP AND DRAW BAR CHARTS
 * (so that we don't have to repeat the code for each bar chart)
 * */
import * as d3 from 'd3';

import data from './data';
import controls from './controls';
import { numFormat } from './utils';

export default {

  margin: {
    top: 25, right: 60, bottom: 75, left: 35
  },
  innerHeight: 0,
  innerWidth: 0,
  xScale: d3.scaleLinear(),
  yScale: d3.scaleLinear(),
  xAxis: d3.axisBottom()
    .tickSize(0, 0)
    .tickFormat(''),
  yAxis: d3.axisLeft(),
  barHeight: 0,


  setup(svg) {
    // Set internal graph dimensions
    this.innerHeight = svg.attr('height') - this.margin.top - this.margin.bottom;
    this.innerWidth = svg.attr('width') - this.margin.left - this.margin.right;

    // Setup initial scales and draw axises
    this.xScale.range([0, this.innerWidth]);
    this.yScale.range([0, this.innerHeight])
      .clamp(true);
    this.xAxis.scale(this.xScale)
      .tickFormat(numFormat);
    this.yAxis.scale(this.yScale);
    svg.append('g')
      .attr('class', 'bars')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
    svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(${this.margin.left},${this.innerHeight + this.margin.top})`)
      .call(this.xAxis);
    svg.append('g')
      .attr('class', 'y axis')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`)
      .call(this.yAxis);
  },


  draw(svg, newData, color, valueName, displayProp) {
    if (!newData || newData.length === 0) {
      // Display a "No data" text
      svg.append('text')
        .text('No data available for this chart.')
        .classed('nodata', true)
        .classed('label', true)
        .attr('x', (this.innerWidth / 2) + this.margin.left - 75)
        .attr('y', (this.innerHeight / 2) + this.margin.top - 75);
    }

    // Remove no data text
    svg.select('text.nodata').remove();

    // Setup scales & axises
    this.xScale.domain([0, d3.max(newData, d => d[valueName])])
      .nice();
    this.yScale.domain([0, d3.max([10, newData.length])])
      .clamp(true)
      .nice();
    this.xAxis.scale(this.xScale)
      .tickSize(6, 0)
      .tickFormat(numFormat);
    this.yAxis.scale(this.yScale).ticks(0);
    this.barHeight = (this.yScale(1) - 20);

    // Update axises
    svg.select('.x.axis')
      .transition()
      .call(this.xAxis)
      .selectAll('text')
      // .filter(function (d,i) { return d!="0"; })
      .attr('transform', 'rotate(-65) translate(-13,-10)')
      .style('text-anchor', 'end');
    svg.select('.y.axis')
      .transition()
      .call(this.yAxis);

    // Enter groups and bars
    // Bind to data
    const groups = svg.select('.bars').selectAll('g.item')
      .data(newData);
    // Exit old groups
    groups.exit().remove();
    // Enter new groups
    let newGroups = groups.enter()
      .append('g')
      .classed('item', true);
    // Add rect to new groups
    newGroups.append('rect')
      .attr('width', '0')
      .attr('height', '0');
    newGroups = newGroups.merge(groups);
    newGroups.attr('transform', (d, i) => `translate(0,${this.yScale(i)})`);
    newGroups.selectAll('text').remove();
    const bars = newGroups.select('rect')
      .on('click', (d) => {
        if (displayProp === 'partner') {
          // top partner chart: select partner
          controls.changeFilters({ partner: d.partner });
        }
        if (displayProp === 'commodity') {
          // top commodities chart: select commodity
          controls.changeFilters({ commodity: d.commodity });
        }
      });
    const labels = newGroups.append('text').classed('label', true);
    const values = newGroups.append('text').classed('value', true);

    // Update groups and bars
    bars.transition()
      .attr('x', 0)
      .attr('y', this.yScale(1) - this.barHeight - 5)
      .style('fill', color)
      .attr('height', this.barHeight)
      .attr('width', d => d3.max([0, this.xScale(+d[valueName])]));
    labels
      .attr('x', '3')
      .attr('y', this.yScale(1) - this.barHeight - 8)
      .text((d) => {
        if (displayProp === 'partner') {
          // top partner chart: select partner
          return data.lookup(d.partner, 'partners', 'text');
        }
        if (displayProp === 'commodity') {
          // top commodities chart: select commodity
          return data.lookup(d.commodity, 'commodities', 'text');
        }
      });
    values
      .attr('x', d => this.xScale(+d[valueName]) + 3)
      .attr('y', this.yScale(1) - 5)
      .text(d => numFormat(d[valueName], null, 1));

    // Exit groups
    groups.exit().remove();
  },


  resizeSvg(svg, newWidth, valueName) {
    svg.attr('width', newWidth);
    this.innerWidth = svg.attr('width') - this.margin.left - this.margin.right;
    // Update xScale and xAxis
    this.xScale.range([0, this.innerWidth]);
    this.xAxis.scale(this.xScale);
    svg.select('.x.axis') // change the x axis
      .transition()
      .call(this.xAxis);
    // Update bars & text
    const groups = svg.selectAll('g.item');
    groups.selectAll('rect')
      .attr('width', d => this.xScale(+d[valueName]) || 1);
    groups.selectAll('text.value')
      .attr('x', d => this.xScale(+d[valueName]) + 3);
  }
};
