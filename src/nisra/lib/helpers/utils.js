import * as d3 from 'd3';

d3.formatDefaultLocale({
  decimal: '.',
  thousands: ',',
  grouping: [3],
  currency: ['£', '']
});

export function numFormat(num) {
  let f = d3.format('$,.1f');
  if (typeof num !== 'number' || isNaN(num)) return 'No data';
  if (num === 0) return '0';
  // Display in billions/millios/thousands
  if (Math.abs(num) >= 1000000000) return `${f((Math.round(num / 100000000)) / 10)} bn`;
  if (Math.abs(num) >= 1000000) return `${f((Math.round(num / 100000)) / 10)} m`;
  if (Math.abs(num) >= 1000) return `${f((Math.round(num / 100)) / 10)} th`;
  // Else display without unit
  f = d3.format('$,.0f');
  return f(num);
}

export function numFormatFull(num) {
  const f = d3.format('$,');
  return f(num);
}

export function numOrdinal(num) {
  if (isNaN(num) || num % 1) { return num; }
  if (num < 20 && num > 10) { return `${num}th`; }
  const last = num.toString().slice(-1);
  let text = '';
  switch (last) {
    case '1':
      text = `${num}st`;
      break;
    case '2':
      text = `${num}nd`;
      break;
    case '3':
      text = `${num}rd`;
      break;
    default:
      text = `${num}th`;
      break;
  }
  return text;
}

export function toTitleCase(str) {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}
