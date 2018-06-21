# SolarNetwork Datum Loader - JavaScript

This project contains classes to help with loading SolarNetwork datum over time ranges.

## DatumLoader

The `DatumLoader` class helps return data from the SolarQuery [/datum/list][datum-list]
endpoint. The class takes care of loading all results for a given search criteria,
including making multiple API requests to download all result pages when more than
one page of results are available.

Here's an example of loading a month's worth of data for SolarNode 123:

```js
const filter = new DatumFilter();
filter.nodeId = 123;
filter.startDate = new Date('Sat, 1 Apr 2017 12:00:00 GMT');
filter.endDate = new Date('Mon, 1 May 2017 12:00:00 GMT');

const urlHelper = new NodeDatumUrlHelper();

new DatumLoader(urlHelper, filter).load((error, results) => {
  // results is an array of Datum objects
});
```

A Promise based API is available as well:

```js
new DatumLoader(urlHelper, filter).fetch().then(results => {
  // results is an array of Datum objects
}).catch(error => {
  // handle error here
});
```

## MultiLoader

The `MultiLoader` class helps load data from multiple `Loader` objects (the 
`DatumLoader` class conforms to that interface). This is useful for pulling
down data from different search criterias all in one go. For example:

```js
const filter1 = new DatumFilter();
filter1.nodeId = 123;
filter1.sourceId = 'a'
 
const filter2 = new DatumFilter();
filter2.nodeId = 234;
filter2.sourceIds = ['b', 'c'];
 
const urlHelper = new NodeDatumUrlHelper();
 
new MultiLoader([
  new DatumLoader(urlHelper, filter1),
  new DatumLoader(urlHelper, filter2),
]).load((error, results) => {
  // results is a 2-element array of Datum arrays
});
```

## DatumRangeFinder

The `DatumRangeFinder` class helps find the date range of available data for a set of
SolarNodes. This is useful when generating reports or charts for a set of SolarNode datum
streams, so the overall start/end dates can be determined before requesting the actual data.
For example:

```js
const urlHelper = new NodeDatumUrlHelper();
urlHelper.publicQuery = true;
urlHelper.nodeId = 123;
urlHelper.sourceIds = ['a', 'b'];

const range = await new DatumRangeFinder(urlHelper).fetch(); 
```

Ranges for more complex queries can be accomplished by passing in an array of URL helper
objects, like this example, continuing from the last one:

```js
const urlHelper2 = new NodeDatumUrlHelper();
urlHelper2.publicQuery = true;
urlHelper2.nodeId = 234;
urlHelper2.sourceId = 'c';

const range2 = await new DatumRangeFinder([urlHelper, urlHelper2]).fetch();
```

## DatumSourceFinder

The `DatumSourceFinder` class helps find the available source IDs for a set of node IDs.

```js
const urlHelper = new NodeDatumUrlHelper();
urlHelper.publicQuery = true;
urlHelper.nodeId = 123;

const sources = await new DatumSourceFinder(urlHelper).fetch();
```

Wildcard patterns can also be used to limit the search to a more specific set of source IDs,
and start/end dates can also be used to narrow the search, for example:

```js
const filter = new DatumFilter();
filter.startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
filter.sourceId = '/power/**';

const sources2 = await new DatumSourceFinder(urlHelper).filter(filter).fetch();
```


 [datum-list]: https://github.com/SolarNetwork/solarnetwork/wiki/SolarQuery-API#datum-list
