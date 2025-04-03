// https://github.com/SolarNetwork/sn-datum-loader-js Version 3.0.0. Copyright 2025 SolarNetwork Foundation.
import { HttpHeaders, Urls } from 'solarnetwork-api-core/lib/net';
import { Logger } from 'solarnetwork-api-core/lib/util';
import { queue } from 'd3-queue';
import { Pagination, DatumFilter, DatumReadingTypes } from 'solarnetwork-api-core/lib/domain';

// The Fetch API subset required by DatumLoader
var fetch$1 = fetch;

var fetch$2 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    default: fetch$1
});

/**
 * An abstract class for JSON client support.
 */
class JsonClientSupport {
    /**
     * The API instance to use.
     */
    api;
    /**
     * An authorization builder to use to make authenticated HTTP requests.
     */
    authBuilder;
    /**
     * Constructor.
     *
     * @param authBuilder the auth builder to authenticate requests with; if not provided
     *                    then only public data can be queried
     */
    constructor(api, authBuilder) {
        this.api = api;
        this.authBuilder = authBuilder;
        if (!authBuilder) {
            api.publicQuery = true;
        }
    }
    /**
     * Create a URL fetch requestor.
     *
     * The returned function can be passed to `d3.queue` or invoked directly.
     *
     * @param url the URL to request.
     * @param signUrl the URL to sign (might be different to `url` if a proxy is used)
     * @returns a function that accepts a callback argument
     */
    requestor(url, signUrl) {
        const auth = this.authBuilder;
        return (cb) => {
            const headers = {
                Accept: "application/json",
            };
            if (auth && auth.signingKeyValid) {
                headers[HttpHeaders.AUTHORIZATION] = auth
                    .reset()
                    .snDate(true)
                    .url(signUrl || url, true)
                    .buildWithSavedKey();
                headers[HttpHeaders.X_SN_DATE] = auth.requestDateHeaderValue;
            }
            const errorHandler = (error) => {
                Logger.error("Error requesting data for %s: %s", url, error);
                cb(new Error(`Error requesting data for ${url}: ${error}`));
            };
            fetch(url, {
                headers: headers,
            }).then((res) => {
                if (!res.ok) {
                    errorHandler(res.statusText);
                    return;
                }
                res.json().then((json) => {
                    const r = json;
                    if (!r.success) {
                        let msg = "non-success result returned";
                        if (r.message) {
                            msg += " (" + r.message + ")";
                        }
                        errorHandler(msg);
                        return;
                    }
                    cb(undefined, r.data);
                }, errorHandler);
            }, errorHandler);
        };
    }
}

const DEFAULT_PAGE_SIZE = 1000;
/**
 * An enumeration of loader state values.
 */
var DatumLoaderState;
(function (DatumLoaderState) {
    /** The loader can be configured and is ready to be used. */
    DatumLoaderState[DatumLoaderState["Ready"] = 0] = "Ready";
    /** The loader is loading datum. */
    DatumLoaderState[DatumLoaderState["Loading"] = 1] = "Loading";
    /** The loader has finished loading datum. */
    DatumLoaderState[DatumLoaderState["Done"] = 2] = "Done";
})(DatumLoaderState || (DatumLoaderState = {}));
/**
 * Load data for a set of source IDs, date range, and aggregate level using either the `listDatumUrl()`
 * or `datumReadingUrl()` URLs of `SolarQueryApi` (the `/datum/list` or `/datum/reading`
 * endpoints).
 *
 * This object is designed to be used once per query. After creating the object and optionally configuring
 * any other settings, call {@link DatumLoader#fetch} to start loading the data. The returned `Promise`
 * will be resolved once all data has been loaded.
 *
 * @example
 * const filter = new DatumFilter();
 * filter.nodeId = 123;
 * // configure other filter settings here...
 *
 * const results = await new DatumLoader(new SolarQueryApi(), filter).fetch();
 * // results is an array of Datum objects
 *
 * @version 3.0.0
 */
class DatumLoader extends JsonClientSupport {
    /** The filter. */
    filter;
    #pageSize;
    #includeTotalResultsCount;
    #callback;
    #urlParameters;
    /**
     * When `true` then call the callback function for every page of data as it becomes available.
     * Otherwise the callback function will be invoked only after all data has been loaded.
     */
    #incrementalMode;
    /**
     * When `true` then invoke the `/datum/reading` endpoint to load data, otherwise use `/datum/list`.
     */
    #readingsMode;
    /**
     * An optional proxy URL to use instead of the host returned by the configured `SolarQueryApi`.
     * This should be configured as an absolute URL to the proxy target, e.g. `https://query.solarnetwork.net/1m`.
     */
    #proxyUrl;
    /**
     * When > 0 then make one request that includes the total result count and first page of
     * results, followed by parallel requests for the remaining pages.
     */
    #concurrency;
    /**
     * A queue to use for parallel mode, when `concurrency` configured > 0.
     */
    #queue;
    #state;
    #results;
    /**
     * Constructor.
     *
     * @param api a URL helper for accessing node datum via SolarQuery
     * @param filter the filter parameters to use
     * @param authBuilder the auth builder to authenticate requests with; if not provided
     *                    then only public data can be queried; when provided a pre-signed
     *                    key must be available
     */
    constructor(api, filter, authBuilder) {
        super(api, authBuilder);
        this.filter = filter;
        this.#pageSize = DEFAULT_PAGE_SIZE;
        this.#includeTotalResultsCount = false;
        this.#callback = null;
        this.#urlParameters = null;
        this.#incrementalMode = false;
        this.#readingsMode = false;
        this.#proxyUrl = null;
        this.#concurrency = 0;
        this.#state = DatumLoaderState.Ready;
    }
    concurrency(value) {
        if (value === undefined) {
            return this.#concurrency;
        }
        if (!isNaN(value) && Number(value) > 0) {
            this.#concurrency = Number(value);
        }
        return this;
    }
    callback(value) {
        if (value === undefined) {
            return this.#callback;
        }
        if (value === null || typeof value === "function") {
            this.#callback = value;
        }
        return this;
    }
    parameters(value) {
        if (value === undefined) {
            return this.#urlParameters;
        }
        if (value === null || typeof value === "object") {
            this.#urlParameters = value;
        }
        return this;
    }
    /**
     * Get the loader state.
     *
     * @returns the state
     */
    state() {
        return this.#state;
    }
    incremental(value) {
        if (value === undefined) {
            return this.#incrementalMode;
        }
        this.#incrementalMode = !!value;
        return this;
    }
    paginationSize(value) {
        if (value === undefined) {
            return this.#pageSize;
        }
        else if (isNaN(Number(value))) {
            value = DEFAULT_PAGE_SIZE;
        }
        this.#pageSize = value;
        return this;
    }
    includeTotalResultsCount(value) {
        if (value === undefined) {
            return this.#includeTotalResultsCount;
        }
        this.#includeTotalResultsCount = !!value;
        return this;
    }
    readings(value) {
        if (value === undefined) {
            return this.#readingsMode;
        }
        this.#readingsMode = !!value;
        return this;
    }
    proxyUrl(value) {
        if (value === undefined) {
            return this.#proxyUrl;
        }
        this.#proxyUrl = value;
        return this;
    }
    /**
     * Initiate loading the data.
     *
     * @returns a `Promise` for the final results
     */
    fetch() {
        if (this.#incrementalMode) {
            return Promise.reject(new Error("Incremental mode is not supported via fetch(), use load(callback) instead."));
        }
        return new Promise((resolve, reject) => {
            this.load((error, results) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(results || []);
                }
            });
        });
    }
    /**
     * Initiate loading the data.
     *
     * As an alternative to configuring the callback function via the {@link DatumLoader.callback}
     * method,a callback function can be passed as an argument to this function. That allows this
     * function to be passed to things like `queue.defer`, for example.
     *
     * @param callback a callback function to use; either this argument must be provided
     *                 or the function must have already been configured via {@link DatumLoader.callback}
     * @returns this object
     */
    load(callback) {
        // to support queue use, allow callback to be passed directly to this function
        if (typeof callback === "function") {
            this.#callback = callback;
        }
        if (!this.#callback) {
            throw new Error("No callback provided.");
        }
        this.#state = DatumLoaderState.Loading;
        if (this.#concurrency > 0) {
            this.#queue = queue(this.#concurrency);
        }
        this.#loadData(new Pagination(this.#pageSize, 0));
        return this;
    }
    /**
     * Invoke the configured callback function.
     *
     * @param error an optional  error
     * @param done `true` if there is no more data to load
     * @param page the incremental mode page
     */
    #handleResults(error, done, page) {
        if (done) {
            this.#state = 2; // done
        }
        if (this.#callback) {
            let args;
            if (this.#incrementalMode) {
                args = [error, this.#results, done, page];
            }
            else {
                args = [error, this.#results, undefined, undefined];
            }
            this.#callback(...args);
        }
    }
    /**
     * Load a single page of data, starting at a specific offset.
     *
     * @param page the page to load
     * @param q the queue to use
     */
    #loadData(page, q) {
        const queryFilter = new DatumFilter(this.filter);
        queryFilter.withoutTotalResultsCount =
            (this.#includeTotalResultsCount || q) && page.offset === 0
                ? false
                : true;
        let url = this.#readingsMode
            ? this.api.datumReadingUrl(DatumReadingTypes.Difference, queryFilter, undefined, undefined, page)
            : this.api.listDatumUrl(queryFilter, undefined, page);
        if (this.#urlParameters) {
            const queryParams = Urls.urlQueryEncode(this.#urlParameters);
            if (queryParams) {
                url += "&" + queryParams;
            }
        }
        const reqUrl = this.#proxyUrl
            ? url.replace(/^[^:]+:\/\/[^/]+/, this.#proxyUrl)
            : url;
        const query = this.requestor(reqUrl, url);
        const handler = (error, data) => {
            if (error) {
                if (!q) {
                    this.#handleResults(error, true);
                    return;
                }
            }
            const dataArray = datumExtractor(data);
            if (dataArray === undefined) {
                Logger.debug("No data available for %s", reqUrl);
                if (!q) {
                    this.#handleResults(undefined, true);
                    return;
                }
            }
            const incMode = this.#incrementalMode;
            const nextOffset = offsetExtractor(data, page);
            const done = !!q || nextOffset < 1;
            const totalResults = data && data.totalResults !== undefined ? data.totalResults : 0;
            if (!q && dataArray) {
                this.#results =
                    this.#results === undefined
                        ? dataArray
                        : this.#results.concat(dataArray);
            }
            if (incMode || (!q && done)) {
                this.#handleResults(undefined, done, page);
            }
            // load additional pages as needed
            if (!done) {
                if (!q && this.#queue && totalResults > 0) {
                    // parallel mode after first page results; queue all remaining pages
                    for (let pOffset = nextOffset; pOffset < totalResults; pOffset += page.max) {
                        this.#loadData(page.withOffset(pOffset), this.#queue);
                    }
                    this.#queue.awaitAll((error, allResults) => {
                        const queryResults = allResults;
                        if (!error &&
                            queryResults &&
                            queryResults.findIndex((el) => el === undefined) >=
                                0) {
                            // some result is unexpectedly undefined; seen this under Node from
                            // https://github.com/driverdan/node-XMLHttpRequest/issues/162
                            // where the HTTP client lib is not reporting back an actual error value
                            // when something happens like a response timeout
                            error = new Error("One or more requests did not return a result, but no error was reported.");
                        }
                        if (!error && queryResults) {
                            queryResults.forEach((queryResult) => {
                                const dataArray = datumExtractor(queryResult);
                                if (!dataArray) {
                                    return;
                                }
                                if (!this.#results) {
                                    this.#results = dataArray;
                                }
                                else {
                                    this.#results =
                                        this.#results.concat(dataArray);
                                }
                            });
                        }
                        this.#handleResults(error !== null ? error : undefined, true);
                    });
                }
                else {
                    // serially move to next page
                    this.#loadData(page.withOffset(nextOffset));
                }
            }
        };
        if (q) {
            q.defer(query);
        }
        else {
            query(handler);
        }
    }
}
/**
 * Extract the datum list from the returned data.
 *
 * @param data the JSON results to extract from
 * @returns the extracted data
 */
function datumExtractor(data) {
    if (Array.isArray(data?.results)) {
        return data.results;
    }
    return undefined;
}
/**
 * Extract the "next" offset to use based on the returned data.
 *
 * If `page` is supplied, then pagination will be based on `page.max` and will continue
 * until less than that many results are returned. If `page` is not supplied, then
 * pagination will be based on `data.returnedResultCount` and will continue until
 * `data.totalResults` has been returned.
 *
 * @param data the JSON results to extract from
 * @param page the incremental mode page
 * @returns the extracted offset, or `0` if no more pages to return
 */
function offsetExtractor(data, page) {
    if (!data) {
        return 0;
    }
    // don't bother with totalResults; just keep going unless returnedResultCount < page.max
    return data.returnedResultCount < page.max
        ? 0
        : data.startingOffset + page.max;
}

/**
 * Class to find the available datum date range for a set of datum filters.
 *
 * This is useful when generating reports or charts for a set of SolarNode datum streams,
 * so the overall start/end dates can be determined before requesting the actual data.
 * It returns an object starting and ending date related properties, for example:
 *
 * ```json
 * {
 *   "timeZone":        "Pacific/Auckland",
 *   "sDate":           Date(1248668709972),
 *   "startDate":       "2009-07-27 16:25",
 *   "startDateMillis": 1248668709972,
 *   "eDate":           Date(1379824746781),
 *   "endDate":         "2013-09-22 16:39",
 *   "endDateMillis":   1379824746781
 * }
 * ```
 *
 * Additionally a `ranges` property is provided with an array of each filter's raw
 * range result, so you can see each result individually if you need that.
 *
 * @example
 * // the simple case, for just one node
 * const filter = new DatumFilter();
 * filter.nodeId = 123;
 * filter.sourceIds = ['a', 'b'];
 * const range = await new DatumRangeFinder(new SolarQueryApi(), filter).fetch();
 *
 * @example
 * // more complex case, for multiple SolarNode / source ID combinations
 * const filter2 = new SolarQueryApi();
 * filter2.nodeId = 234;
 * filter2.sourceId = 'c';
 * const range2 = await new DatumRangeFinder(api, [filter, filter2]).fetch();
 *
 * @example
 * // with authentication; note the authentication must be valid for all nodes!
 * const auth = new AuthorizationV2Builder('my-token');
 * auth.saveSigningKey('secret');
 * const range3 = await new DatumRangeFinder(api, [filter1, filter2], auth).fetch();
 *
 * @version 2.0.0
 */
class DatumRangeFinder extends JsonClientSupport {
    #filters;
    /**
     * Constructor.
     *
     * @param api the API helper to use
     * @param filters the filter(s) to find the ranges for; each filter must provide at least
     *                one node ID
     * @param authBuilder the auth builder to authenticate requests with; if not provided
     *                    then only public data can be queried; when provided a pre-signed
     *                    key must be available
     */
    constructor(api, filters, authBuilder) {
        super(api, authBuilder);
        this.#filters = Array.isArray(filters) ? filters : [filters];
    }
    /**
     * Initiate loading the data.
     *
     * @returns a `Promise` for the final results
     */
    fetch() {
        return new Promise((resolve, reject) => {
            this.load((error, results) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(results || {});
                }
            });
        });
    }
    /**
     * Asynchronously find the available datum range using a callback.
     *
     * @param callback the callback function to invoke with the results
     * @returns this object
     */
    load(callback) {
        const q = queue();
        for (const filter of this.#filters) {
            const url = this.api.reportableIntervalUrl(filter.nodeId, filter.sourceIds);
            q.defer(this.requestor(url));
        }
        q.awaitAll((error, results) => {
            if (error) {
                Logger.error("Error requesting available data range: %s", error);
                callback(error);
                return;
            }
            const result = this.#extractReportableInterval(results);
            callback(undefined, result);
        });
        return this;
    }
    #extractReportableInterval(results) {
        let result, i;
        for (i = 0; i < results.length; i += 1) {
            const repInterval = results[i];
            if (repInterval?.endDate === undefined) {
                Logger.debug("No data available for %s sources %s", this.#filters[i].nodeId, this.#filters[i].sourceIds !== undefined
                    ? this.#filters[i].sourceIds.join(",")
                    : "");
                continue;
            }
            if (result === undefined) {
                result = Object.assign({}, repInterval);
            }
            else {
                // merge start/end dates
                // note we don't copy the time zone... this breaks when the tz are different!
                if (repInterval.endDateMillis > result.endDateMillis) {
                    result.endDateMillis = repInterval.endDateMillis;
                    result.endDate = repInterval.endDate;
                }
                if (repInterval.startDateMillis < result.startDateMillis) {
                    result.startDateMillis = repInterval.startDateMillis;
                    result.startDate = repInterval.startDate;
                }
            }
        }
        if (result) {
            if (result.startDateMillis !== undefined) {
                result.sDate = new Date(result.startDateMillis);
            }
            if (result.endDateMillis !== undefined) {
                result.eDate = new Date(result.endDateMillis);
            }
            result.ranges = results;
        }
        return result;
    }
}

/**
 * Class to find the available datum sources for a set of node datum URL helpers.
 *
 * This helper is useful for finding what source IDs are avaialble for a set of nodes.
 * It returns an object with node ID properties with associated source ID array values,
 * for example:
 *
 * ```
 * { 123: ["a", "b", "c"] }
 * ```
 * @example
 * // the simple case, all available sources for just one SolarNode
 * const filter = new DatumFilter();
 * filter.nodeId = 123;
 * const sources = await new DatumSourceFinder(new SolarQueryApi(), filter).fetch();
 *
 * @example
 * // find all sources matching a wildcard pattern within the past day
 * const filter2 = new DatumFilter();
 * filter2.startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
 * filter2.sourceId = '/power/**';
 * const sources2 = await new DatumSourceFinder(new SolarQueryApi(), filter2).fetch();
 *
 * @example
 * // find all sources across multiple SolarNodes
 * const filter3 = new DatumFilter();
 * filter3.nodeId = 234;
 * const sources3 = await new DatumSourceFinder(new SolarQueryApi(), [urlHelper1, urlHelper3]).fetch();
 */
class DatumSourceFinder extends JsonClientSupport {
    #filters;
    /**
     * Constructor.
     *
     * @param api the API helper to use
     * @param filters the filter(s) to find the sources for
     * @param authBuilder the auth builder to authenticate requests with; if not provided
     *                    then only public data can be queried; when provided a pre-signed
     *                    key must be available
     */
    constructor(api, filters, authBuilder) {
        super(api, authBuilder);
        this.#filters = Array.isArray(filters) ? filters : [filters];
    }
    /**
     * Initiate loading the data.
     *
     * @returns a `Promise` for the final results
     */
    fetch() {
        return new Promise((resolve, reject) => {
            this.load((error, results) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(results || {});
                }
            });
        });
    }
    /**
     * Asynchronously find the available sources using a callback.
     *
     * @param callback the callback function to invoke with the results
     * @returns this object
     */
    load(callback) {
        const q = queue();
        for (const filter of this.#filters) {
            const url = this.api.availableSourcesUrl(filter, true);
            q.defer(this.requestor(url));
        }
        q.awaitAll((error, results) => {
            if (error || !results) {
                Logger.error("Error requesting available sources: %s", error);
                callback(error);
                return;
            }
            const result = {};
            for (const data of results) {
                if (!data) {
                    continue;
                }
                for (const pair of data) {
                    let nodeIds = result[pair.nodeId];
                    if (!nodeIds) {
                        nodeIds = [];
                        result[pair.nodeId] = nodeIds;
                    }
                    if (nodeIds.indexOf(pair.sourceId) < 0) {
                        nodeIds.push(pair.sourceId);
                    }
                }
            }
            callback(undefined, result);
        });
        return this;
    }
}

export { DatumLoader, DatumRangeFinder, DatumSourceFinder, fetch$2 as FetchApi, JsonClientSupport };
//# sourceMappingURL=solarnetwork-datum-loader.es.js.map
