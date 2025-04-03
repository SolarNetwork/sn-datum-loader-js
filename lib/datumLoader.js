import { queue } from "d3-queue";
import { DatumFilter, DatumReadingTypes, Pagination, } from "solarnetwork-api-core/lib/domain";
import { Logger as log } from "solarnetwork-api-core/lib/util";
import { Urls, } from "solarnetwork-api-core/lib/net";
import { default as JsonClientSupport } from "./jsonClientSupport.js";
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
                log.debug("No data available for %s", reqUrl);
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
export default DatumLoader;
export { DatumLoaderState };
//# sourceMappingURL=datumLoader.js.map