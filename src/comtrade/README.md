# Comtrade trademap

![Trademap screenshot](../../trademap.jpg)

Live URL: https://comtrade.un.org/labs/dit-trade-vis

## Technical overview

The application is a single page HTML5, CSS, JS application. The entire app logic is in Javascript and therefore run in the browser.
There is no server backend required. Data is pulled by the browser from the [Comtrade API](http://comtrade.un.org/data/).

The point of entry for the application is the `index.html` file which includes all necessary CSS and JS assets.

`app.js` is the entry point for the javascript code. Dependencies are managed through ES6 modules and packaged by webpack.

The `lib/helpers` folder contains modules for different components of the visualization:

* `data.js`: This module handles interaction with the Comtrade API as well as managing
  [Crossfilter](https://github.com/square/crossfilter) which we use as a local database.
  The _setup_ function of the module loads all necessary JSON and CSV data (see the
  [`data/sources/sources.md`](data/sources/sources.md) file). The _query_ function runs API queries ensuring throttling (no more than 1 query fired per second) as well as avoiding duplicate queries. It also stores the retrieved data into crossfilter avoiding duplicate records. The _getData_ function queries the crossfilter and the _combineData_ function merges import and export records adding balance and bilateral trade info.
* `controls.js`: Sets up and handles the behaviours associated with the main controls (reporter, partner, commodity, flow, year). It also fires events, alerting charts if filters are changed so that they can update accordingly. The file also manages the changes to the URL location bar ensuring that a persistent URL is used, enabling users to copy links to specific views of the data.
* `gui.js`: Sets up and manages the behaviours of other GUI components (drop down menus, page scrolling, PNG, SVG and CSV downloading etc.)
* `charts.js`: Triggers the setup of each of the charts on the page, defines some common properties like colours and also injects CSS code into the SVG elements to make the SVG exports behave better.
* `embed.js`: The module is used instead of the charts one and only triggers the rendering of one chart hiding all other markup. It is used to render the embedded chart view and is triggered by having an `&embed=yearChart` query parameter.
* `charts/*.js`: Each file contains specific logic for each of the different charts.
* `rowchart.js`: Contains re-usable logic to draw each of the row charts and is invoked from the modules inside the `charts` folder.
* `intro.js`: Contains the logic and steps for the introduction slideshow.

### Build process: packaging and optimization

To be able to build or serve the visualization you need to install dependencies:

```
npm install
```

The visualization can be served locally for development run:

```
npm run start:comtrade
```

Note that this will proxy requests to comtrade through the Webpack dev server in order to avoid issues with CORS.

To clean the `dist/comtrade` directory before a build run:

```
npm run clean:comtrade
```

To build the project for distribution:

```
npm run build:comtrade
```

The output will be generated in the `dist/comtrade` folder which can be deployed to a production server.

### Sources and API information:

More details about the sources and the API can be found in the [`data/sources/sources.md`](data/sources/sources.md) file.
