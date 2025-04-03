# SolarNetwork Datum Loader - JavaScript

This project contains classes to help with loading SolarNetwork datum over time ranges.

To include the library in your NPM-based project, run the following:

```sh
npm i solarnetwork-datum-loader
```

# API docs

The latest API documentation is published [here](https://solarnetwork.github.io/sn-datum-loader-js/), or
you can build the API documentation by running the `apidoc` script:

```sh
npm run apidoc
```

That will produce HTML documentation in `docs/html`.

## DatumLoader

The `DatumLoader` class helps return data from the SolarQuery [/datum/list][datum-list]
endpoint. The class takes care of loading all results for a given search criteria,
including making multiple API requests to download all result pages when more than
one page of results are available.

Here's an example of loading a month's worth of data for SolarNode 123:

```js
const filter = new DatumFilter();
filter.nodeId = 123;
filter.startDate = new Date("Sat, 1 Apr 2017 12:00:00 GMT");
filter.endDate = new Date("Mon, 1 May 2017 12:00:00 GMT");

const api = new SolarQueryApi();

new DatumLoader(api, filter).load((error, results) => {
	// results is an array of Datum objects
});
```

A Promise based API is available as well:

```js
const result = await new DatumLoader(api, filter).fetch();
```

## MultiLoader

The `MultiLoader` class helps load data from multiple `Loader` objects (the
`DatumLoader` class conforms to that interface). This is useful for pulling
down data from different search criterias all in one go. For example:

```js
const filter1 = new DatumFilter();
filter1.nodeId = 123;
filter1.sourceId = "a";

const filter2 = new DatumFilter();
filter2.nodeId = 234;
filter2.sourceIds = ["b", "c"];

const api = new SolarQueryApi();

new MultiLoader([
	new DatumLoader(api, filter1),
	new DatumLoader(api, filter2),
]).load((error, results) => {
	// results is a 2-element array of Datum arrays
});

# or via promise...
const result = await new MultiLoader([
	new DatumLoader(api, filter1),
	new DatumLoader(api, filter2),
]).fetch();
```

## DatumRangeFinder

The `DatumRangeFinder` class helps find the date range of available data for a set of
SolarNodes. This is useful when generating reports or charts for a set of SolarNode datum
streams, so the overall start/end dates can be determined before requesting the actual data.
For example:

```js
const api = new SolarQueryApi();

const filter = new DatumFilter();
filter.nodeId = 123;
filter.sourceIds = ["a", "b"];

const range = await new DatumRangeFinder(api, filter).fetch();
```

Ranges for more complex queries can be accomplished by passing in an array of filters,
like this example, continuing from the last one:

```js
const filter2 = new DatumFilter();
filter2.nodeId = 234;
filter2.sourceId = "c";

const range2 = await new DatumRangeFinder(api, [filter1, filter2]).fetch();
```

## DatumSourceFinder

The `DatumSourceFinder` class helps find the available source IDs for a set of node IDs.

```js
const api = new SolarQueryApi();

const filter = new DatumFilter();
filter.nodeId = 123;

const sources = await new DatumSourceFinder(api, filter).fetch();
```

Wildcard patterns can also be used to limit the search to a more specific set of source IDs,
and start/end dates can also be used to narrow the search, for example:

```js
const api = new SolarQueryApi();

const filter = new DatumFilter();
filter.startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
filter.sourceId = "/power/**";

const sources2 = await new DatumSourceFinder(api, filter).fetch();
```

# Building

The build uses [NPM][npm] and requires Node 18+. First, initialize the dependencies:

```sh
npm ci
```

Then you can run the `build` script:

```sh
npm run build:dist
```

That will produce ES2022 modules with an entry point in `lib/index.js`.

You can also produce an ES2022 bundle by running `npm run build:bundle`. That will produce a single
bundled file at `lib/solarnetwork-datum-loader.es.js`.

You can also produce an CJS bundle by running `npm run build:bundle:cjs`. That will produce a single
bundled file at `lib/solarnetwork-datum-loader.es.cjs`.

# Releases

Releases are done using the gitflow branching model. Gitflow must be installed on your host system.
Then you can run

```shell
npm run release
```

to version, build, commit, and publish the release. See the [generate-release][generate-release]
site for more information.

# Unit tests

The unit tests can be run by running the `test` script:

```sh
npm test
```

That will output the test results and produce a HTML code coverage report at `coverage/index.html`.

[datum-list]: https://github.com/SolarNetwork/solarnetwork/wiki/SolarQuery-API#datum-list
[generate-release]: https://github.com/mrkmg/node-generate-release
[npm]: https://www.npmjs.com/
