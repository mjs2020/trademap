## Sources of data and how to update

The [Comtrade API documentation](http://comtrade.un.org/data/doc/api/) links some configuration files to populate
select2 dropdown menus. Additionally other info is available through other UN websites.
The list below is an overview of resources consumed by the visualization:

### Temporary CORS issue
At the time of development the following files are not served using CORS from the comtrade.un.org server:

 * reporterAreas.json (http://comtrade.un.org/data/cache/reporterAreas.json)
 * partnerAreas.json (http://comtrade.un.org/data/cache/partnerAreas.json)
 * classificationHS.json (http://comtrade.un.org/data/cache/classificationHS.json).

These are therefore included in this repository and served locally. Once CORS has been enabled on the comtrade server the preferred option will be to use them directly.

### reporterAreas.json and partnerAreas.json

Contains the list of reporter/partner countries/areas in the following format suitable for select2:

```
{
  "more": false,
  "results": [
    {
        "id": "826",
        "text": "United Kingdom"
    },
    {...}
  ]
}
```

Found on this page: [http://comtrade.un.org/data/doc/api/](http://comtrade.un.org/data/doc/api/)

Direct links:

* [http://comtrade.un.org/data/cache/reporterAreas.json](http://comtrade.un.org/data/cache/reporterAreas.json)
* [http://comtrade.un.org/data/cache/partnerAreas.json](http://comtrade.un.org/data/cache/partnerAreas.json)

Note that the two are not the same and are not interchangeable, the partner areas including areas that are not reporters (e.g. "Eastern Europe nep")

### classificationHS.json and classificationEB02.json

The UN Comtrade documentation offers a [classificationHS.json](http://comtrade.un.org/data/cache/classificationHS.json) file which includes AG6
level of detail. A filtered down version of this JSON file has been generated: [`classificationHS_AG2.json`](classificationHS_AG2.json) to include only AG2 level of detail.
If Comtrade provide a similar file in the future then it will be preferred to link directly to their version (pending CORS is allowed).

The filtered version was generated using a Nodejs command line script available in [`data/utilities/commodities_filter.js`](utilities/commodities_filter.js). Usage details
are included in the comments within the script.

For sevices the classification in EBOPS2002 is available [here](https://comtrade.un.org/data/cache/classificationEB02.json) and has been downloaded and included in the package.

### isoCodes.xls and isoCodes.csv

isoCodes.json contains a mapping of the codes used for reporters and partners by Comtrade to ISO 2 letter and 3 letter codes as well as the numerical value used internally in the choropleth visualization to identify the country.

**The UN data is sourced here:**

Found on this page: http://unstats.un.org/unsd/tradekb/Knowledgebase/Comtrade-Country-Code-and-Name

Direct link: http://unstats.un.org/unsd/tradekb/Attachment321.aspx

**ISO Codes (country-codes.csv) are sourced here:**

Link: http://data.okfn.org/data/core/country-codes
