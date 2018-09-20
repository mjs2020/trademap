# NISRA trademap

## Static HMRC Data API

### Data sources

The NISRA trademap depends on HMRC data which is provided in txt files with fixed length values and no delimiters. Data is provided in separate `.txt` files by quarter. Each record represents the trade value (in GBP) and mass (in Kg) between a reporter (NUTS1) and a partner (country or area) within an SITC1 and SITC2 classification for that quarter.

Each row is formatted as follows:

```
3Q2017EEAAA  #1001     2025     1805
```

The data can be extracted from each row as indicated in the following table:

| Field name          | Chars     | Values                                                                     |
| ------------------- | --------- | -------------------------------------------------------------------------- |
| Quarter             | 1-2 (2)   | The quarter: `1-4` followed by the letter `Q`                              |
| Year                | 3-6 (4)   | The year `2013-2017`                                                       |
| Flow                | 7 (1)     | The flow direction `I` (Import) or `E` (Export)                            |
| Reporter (NUTS1)    | 8-9 (2)   | Identifier of the NUTS1 reporter (12 possible, see separate table)         |
| Partner (Labarea)   | 10 (1)    | Identifier of partner world region (values `A` to `J`, see separate table) |
| Partner (codeseq)   | 11-13 (3) | Identifier of partner country (numerical)                                  |
| Partner (codealpha) | 14-15 (2) | Identifier of partner country (alpha), see dictionary below                |
| SITC1               | 16 (1)    | Identifier of trade category in SITC1, see dictionary below                |
| SITC2               | 1-18 (2)  | Identifier of trade category in SITC2, see dictionary below                |
| Value               | 19-27 (9) | Value of trade in GBP (thousands)                                          |
| Mass                | 28-36 (9) | Mass of trade in Kg (thousands)                                            |

**_NOTE:_** Chars column expressed as `startIndex`-`endIndex` (`length`)

This is a regular expression which allows extracting values from a row:

```
/^([1-4])Q(\d{4})([IE])([A-Z]{2})([A-J])([A-Z0-9 ]{3})([A-Z0-9#]{2})(\d)(\d{2})([ 0-9]{9})([ 0-9]{9})/
```

### Data processing and aggregation

Praparing data for consumption by the data visualisation requires the following steps:

- Values should be aggregated from quarterly to yearly data.
- Aggregated totals should be computed as shown in the table below.
- Bilateral trade (imports + exports) and trade balance (exports - imports) are computed for each record (including aggregated totals).
- % of total exports/imports should be computed for each partner-reporter at both labarea/codalpha level and sitc1/sitc2 level.
- Ranking should be computed for partners for import, export, bilateral and balance (including aggregated totals).

The aggregated totals should map to the following **aggregation levels** which respond to the following queries:

| Partner  | Comm   | Description                                               | Used in                                      |
| :------: | :----: | --------------------------------------------------------- | -------------------------------------------- |
| codalpha | SITC2  | Trade in **Y** between **rep** and **part** of **SITC2**  | map, infobox, yearChart, topPart., topComm.  |
| codalpha | SITC1  | Trade in **Y** between **rep** and **part** of **SITC1**  | map, infobox, yearChart, topPart., topComm.  |
| codalpha | all    | Trade in **Y** between **rep** and **part**               | map, infobox, yearChart, topPart.            |
| labarea  | SITC2  | Trade in **Y** between **rep** and **part** of **SITC2**  | map, infobox, yearChart, topPart., topComm.  |
| labarea  | SITC1  | Trade in **Y** between **rep** and **part** of **SITC1**  | map, infobox, yearChart, topPart., topComm.  |
| labarea  | all    | Trade in **Y** between **rep** and **part**               | map, infobox, yearChart, topPart.            |
| all      | SITC2  | Trade in **Y** between **rep** and **world** of **SITC2** | yearChart, topComm.                          |
| all      | SITC1  | Trade in **Y** between **rep** and **world** of **SITC1** | yearChart, topComm.                          |
| all      | all    | Trade in **Y** between **rep** and **world**              | yearChart                                    |

**_NOTE:_** In the visualization controls **year** and **reporter** (`nuts1`) are always set; **partner** (`codalpha` or `labarea`) and **commodity** (`sitc1` or `sitc2`) are optional.

### Static API interface

To make the data usable by the web-based visualization it needs to to be split into manageable chunks that can be loaded on demand via a simple API.

The [`scripts/nisra/api-processor.js`](../../scripts/nisra/api-processor.js) script will read the source files from `src/nisra/api` and ouput them to `dist/nisra/api`. It currently takes a few minutes to run.

**_NOTE:_** HMRC files are not included in this repository for licencing reasons.

The static file api has the following structure:

/api/`{reporter}`.csv

### Generating the static API

The [`src/nisra/api/utilities/api-preprocessor.js`](src/nisra/api/utilities/api-preprocessor.js) script will read the HMRC txt files and generate the CSV files. It can be run from command line from the root of the project with:

```
npm run preprocess:nisra
```

### Data dictionaries

Data dictionaries for [`reporters`](data/reporters.json), [`partners`](data/partners.json), [`years`](data/years.json), [`commodities`](data/commodities.json) are stored in the [`data`](data) sub-folder.

#### Reporters [(nuts1)](https://en.wikipedia.org/wiki/NUTS_1_statistical_regions_of_England)

See/edit [`reporters.json`](data/reporters.json).

There are 12 reporters:

| nuts1 | name                     |
| ----- | ------------------------ |
| EA    | East                     |
| EM    | East Midlands            |
| LO    | London                   |
| NE    | North East               |
| NI    | Northern Ireland         |
| NW    | North West               |
| SC    | Scotland                 |
| SE    | South East               |
| SW    | South West               |
| WA    | Wales                    |
| WM    | West Midlands            |
| YH    | Yorkshire and the Humber |
| ZA    | Unallocated-Known        |
| ZB    | Unallocated-Unknown      |

#### Partners (codalpha or labarea: 119 values)

There are 119 partners which can be identified by:

- `codalpha` a two letter code identifying the indivudual country (codes starting with `#` as well as `QS` and `QR` are aggregates and are therefore excluded)
- `labarea` a single letter code (`A-J`) identifying a geographic or political region.

The json object will contain for each country the labarea that it belongs to and the numerical ISO id that identifies the country in the choropleth.

See/edit [`partners.json`](data/partners.json).

#### Years (5 values)

See/edit [`years.json`](data/years.json).

There is curently data for 5 years (from 2013 to 2017). Edit if other data is added.

#### Commodities (77 values)

See/edit [`commodities.json`](data/commodities.json).

There are 10 classifications in SITC1 (0-9) and 67 classifications in SITC2 (00-98) for a total of 77 values.

## Filters and behaviours

The following table represents the behaviours of the charts in response to specific filters. `X` markes a filter for which a selection is present while `-` markes an unselected filter. Reporter and year are always selected.

| Rep   | Part  | Comm  | Year  | Choropleth / InfoBox      | Year linechart            | Markets rowCharts | Commodities rowCharts |
| :---: | :---: | :---: | :---: | ------------------------- | ------------------------- | ----------------- | --------------------- |
| `X`   | `-`   | `-`   | `X`   | rep to world for all sitc | rep to world for all sitc | shown             | shown                 |
| `X`   | `X`   | `-`   | `X`   | rep to world for all sitc | rep to part for all sitc  | hidden            | shown                 |
| `X`   | `-`   | `X`   | `X`   | rep to world for sitc     | rep to world for sitc     | shown             | hidden                |
| `X`   | `X`   | `X`   | `X`   | rep to world for sitc     | rep to part for sitc      | hidden            | hidden                |
