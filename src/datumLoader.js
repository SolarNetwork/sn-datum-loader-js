import {
	DatumFilter,
	DatumReadingTypes,
	HttpHeaders,
	Logger as log,
	NodeDatumUrlHelper,
	Pagination,
	urlQuery
} from "solarnetwork-api-core";

import { queue } from "d3-queue";
import JsonClientSupport from "./jsonClientSupport";

/**
 * @typedef {Object} Datum
 * @property {string} created the datum date
 * @property {string} sourceId the control ID
 */

/**
 * The data callback function.
 *
 * @callback DatumLoader~dataCallback
 * @param {Error} [error] an error if a failure occurred
 * @param {Datum[]} data the result data
 * @param {boolean} [done] in incremental mode, will be `true` when invoked on the *last* page of data
 * @param {Pagination} [page] in incremental mode, the page associated with the data
 */

/**
 * Load data for a set of source IDs, date range, and aggregate level using either the `listDatumUrl()`
 * or `datumReadingUrl()` URLs of `NodeDatumUrlHelperMixin` (the `/datum/list` or `/datum/reading`
 * endpoints).
 *
 * This object is designed to be used once per query. After creating the object and configuring an
 * asynchronous callback function with {@link DatumLoader#callback}, call {@link DatumLoader#load}
 * to start loading the data. The callback function will be called once all data has been loaded. The
 * callback function can also be passed as an argument to the {@link DatumLoader#load} method directly.
 *
 * @implements {Loader}
 * @extends {JsonClientSupport}
 * @example
 * const filter = new DatumFilter();
 * filter.nodeId = 123;
 * // configure other filter settings here...
 *
 * const urlHelper = new NodeDatumUrlHelper();
 *
 * new DatumLoader(urlHelper, filter).load((error, results) => {
 *   // results is an array of Datum objects
 * });
 * @version 1.2.0
 */
class DatumLoader extends JsonClientSupport {
	/**
	 * Constructor.
	 *
	 * @param {NodeDatumUrlHelperMixin} urlHelper a URL helper for accessing node datum via SolarQuery
	 * @param {DatumFilter} filter the filter parameters to use
	 * @param {AuthorizationV2Builder} [authBuilder] the auth builder to authenticate requests with; if not provided
	 *                                               then only public data can be queried; when provided a pre-signed
	 *                                               key must be available
	 */
	constructor(urlHelper, filter, authBuilder) {
		super(authBuilder);
		Object.defineProperties(this, {
			/**
			 * The class version.
			 *
			 * @memberof DatumLoader
			 * @readonly
			 * @type {string}
			 */
			version: { value: "1.2.0" }
		});

		/** @type {NodeDatumUrlHelper} */
		this.urlHelper = urlHelper || new NodeDatumUrlHelper();
		if (!authBuilder) {
			urlHelper.publicQuery = true;
		}

		/** @type {DatumFilter} */
		this.filter =
			filter ||
			new DatumFilter({
				nodeIds: this.urlHelper.nodeIds,
				withoutTotalResultsCount: true
			});

		/**
		 * @type {number}
		 * @private
		 */
		this._pageSize = 1000;

		/**
		 * @type {boolean}
		 * @private
		 */
		this._includeTotalResultsCount = false;

		/**
		 * @type {DatumLoader~dataCallback}
		 * @private
		 */
		this._finishedCallback = undefined;

		/**
		 * @type {object}
		 * @private
		 */
		this._urlParameters = undefined;

		/**
		 * When `true` then call the callback function for every page of data as it becomes available.
		 * Otherwise the callback function will be invoked only after all data has been loaded.
		 * @type {boolean}
		 * @private
		 */
		this._incrementalMode = false;

		/**
		 * When `true` then invoke the `/datum/reading` endpoint to load data, otherwise use `/datum/list`.
		 * @type {boolean}
		 * @private
		 */
		this._readingsMode = false;

		/**
		 * An optional proxy URL to use instead of the host returned by the configured `NodeDatumUrlHelperMixin`.
		 * This should be configured as an absolute URL to the proxy target, e.g. `https://query.solarnetwork.net/1m`.
		 * @type {string}
		 * @private
		 */
		this._proxyUrl = undefined;

		/**
		 * When > 0 then make one request that includes the total result count and first page of
		 * results, followed by parallel requests for the remaining pages.
		 * @type {number}
		 * @private
		 */
		this._concurrency = 0;

		/**
		 * A queue to use for parallel mode, when `concurrency` configured > 0.
		 * @type {queue}
		 * @private
		 */
		this._queue = null;

		/**
		 * @type {number}
		 * @private
		 */
		this._state = 0;

		/**
		 * @type {Datum[]}
		 * @private
		 */
		this._results = undefined;
	}

	/**
	 * Get or set the concurrency limit to use for parallel requests.
	 *
	 * By default requests are not made in parallel (this property is configured as `0`). Change
	 * to a positive number to enable parallel query mode.
	 *
	 * When parallel mode is enabled the loader will make one request that includes
	 * the total result count and first page of results, followed by parallel requests for any remaining pages
	 * based on that total result count and configured page size.
	 *
	 * @param {number} [value] the concurrency level to use, or `Infinity` for no limit
	 * @returns {number|DatumLoader} when used as a getter, the current concurrency value, otherwise this object
	 * @since 1.1.0
	 */
	concurrency(value) {
		if (value === undefined) {
			return this._concurrency;
		}
		if (!isNaN(value) && Number(value) > 0) {
			this._concurrency = Number(value);
		}
		return this;
	}

	/**
	 * Get or set the callback function, invoked after all data has been loaded. The callback
	 * function will be passed two arguments: an error and the results. In incremental mode,
	 * the callback will also be passed a boolean that will be `true` on that last page of data,
	 * and a `Pagination` that details which page the callback represents.
	 *
	 * @param {DatumLoader~dataCallback} [value] the callback function to use
	 * @returns  {DatumLoader~dataCallback|DatumLoader} when used as a getter, the current callback function, otherwise this object
	 */
	callback(value) {
		if (!value) {
			return this._finishedCallback;
		}
		if (typeof value === "function") {
			this._finishedCallback = value;
		}
		return this;
	}

	/**
	 * Get or set additional URL parameters. The parameters are set as object properties.
	 * If a property value is an array, multiple parameters for that property will be added.
	 *
	 * @param {object} [value] the URL parameters to include with the JSON request
	 * @returns {object|DatumLoader} when used as a getter, the URL parameters, otherwise this object
	 */
	parameters(value) {
		if (!value) return this._urlParameters;
		if (typeof value === "object") {
			this._urlParameters = value;
		}
		return this;
	}

	/**
	 * Get or set _incremental mode_ for loading the data.
	 *
	 * When incremental mode is enabled (set to `true`) then the callback function will be invoked
	 * for _each result page_ that is loaded. The function will be passed a second `boolean` argument
	 * that will be set to `true` only on the last page of result data, and a third Pagination`
	 * object argument that details the starting offset of the page.
	 *
	 * When incremental mode is disabled (set to `false`, the default) then all result pages are
	 * combined into a single array and the callback will be invoked just once.
	 *
	 * @param {boolean} [value] the incremental mode to set
	 * @returns {boolean|DatumLoader} when used a a getter, the incremental mode; otherwise this object
	 */
	incremental(value) {
		if (value === undefined) return this._incrementalMode;
		this._incrementalMode = !!value;
		return this;
	}

	/**
	 * Get or set the result pagination size.
	 *
	 * @param {number} [value] the pagination size to set; defaults to `1000`
	 * @returns {number|DatumLoader} when used as a getter, the pagination size; otherwise this object
	 */
	paginationSize(value) {
		if (isNaN(Number(value))) return this._pageSize;
		this._pageSize = value;
		return this;
	}

	/**
	 * Get or set the flag for requesting the total results count.
	 *
	 * By default the datum loader will _not_ request the overal total result count when querying
	 * for data, as this speeds up queries. By setting this to `true` the total result count will
	 * be requested on the _first_ query page.
	 *
	 * @param {boolean} [value] the flag to include total results count
	 * @returns {boolean|DatumLoader} when used a a getter, the total results count inclusion mode; otherwise this object
	 */
	includeTotalResultsCount(value) {
		if (value === undefined) return this._includeTotalResultsCount;
		this._includeTotalResultsCount = !!value;
		return this;
	}

	/**
	 * Get or set _readings mode_ for loading the data.
	 *
	 * When readings mode is enabled (set to `true`) then the `/datum/reading` endpoint will be invoked
	 * to load data.
	 *
	 * When readings mode is disabled (set to `false`, the default) then the `/datum/list` endpoint will
	 * be invoked to load data.
	 *
	 * @param {boolean} [value] the readings mode to set
	 * @returns {boolean|DatumLoader} when used a a getter, the readings mode; otherwise this object
	 */
	readings(value) {
		if (value === undefined) return this._readingsMode;
		this._readingsMode = !!value;
		return this;
	}

	/**
	 * Get or set the URL to a proxy to use for loading the data.
	 *
	 * This can be configured as an absolute URL to the proxy server to use instead of making requests
	 * directly to the URL returned by the configured `NodeDatumUrlHelperMixin`. For example:
	 *
	 * * https://query.solarnetwork.net
	 * * https://query.solarnetwork.net/1m
	 *
	 * @param {string} [value] the proxy URL to set, or `null` or an empty string to not use any proxy
	 * @returns {string|DatumLoader} when used a a getter, the readings mode; otherwise this object
	 */
	proxyUrl(value) {
		if (value === undefined) return this._proxyUrl;
		this._proxyUrl = value ? value : undefined;
		return this;
	}

	/**
	 * Initiate loading the data.
	 *
	 * As an alternative to configuring the callback function via the {@link DatumLoader#callback}
	 * method,a callback function can be passed as an argument to this function. That allows this
	 * function to be passed to things like `queue.defer`, for example.
	 *
	 * @param {DatumLoader~dataCallback} [callback] a callback function to use; either this argument must be provided
	 *                              or the function must have already been configured via {@link DatumLoader#callback}
	 * @returns {DatumLoader} this object
	 */
	load(callback) {
		// to support queue use, allow callback to be passed directly to this function
		if (typeof callback === "function") {
			this._finishedCallback = callback;
		}
		this._state = 1;
		if (this._concurrency > 0) {
			this._queue = queue(this._concurrency === Infinity ? null : this._concurrency);
		}
		this.loadData(new Pagination(this._pageSize, 0));
		return this;
	}

	/**
	 * Invoke the configured callback function.
	 *
	 * @param {Error} [error] an optional  error
	 * @param {boolean} done `true` if there is no more data to load
	 * @param {Pagination} [page] the incremental mode page
	 * @returns {void}
	 * @private
	 */
	handleResults(error, done, page) {
		if (done) {
			this._state = 2; // done
		}

		if (this._finishedCallback) {
			let args = [error, this._results];
			if (this._incrementalMode) {
				args.push(done);
				args.push(page);
			}
			this._finishedCallback.apply(this, args);
		}
	}

	/**
	 * Load a single page of data, starting at a specific offset.
	 *
	 * @param {Pagination} [page] the page to load
	 * @returns {void}
	 * @private
	 */
	loadData(page) {
		const auth = this.authBuilder;
		const q = this._queue;
		let pagination = page instanceof Pagination ? page : new Pagination();
		const queryFilter = new DatumFilter(this.filter);
		queryFilter.withoutTotalResultsCount =
			(this._includeTotalResultsCount || q) && pagination.offset === 0 ? false : true;

		let url = this._readingsMode
			? this.urlHelper.datumReadingUrl(
					queryFilter,
					DatumReadingTypes.Difference,
					undefined,
					undefined,
					pagination
			  )
			: this.urlHelper.listDatumUrl(queryFilter, undefined, pagination);
		if (this._urlParameters) {
			let queryParams = urlQuery.urlQueryEncode(this._urlParameters);
			if (queryParams) {
				url += "&" + queryParams;
			}
		}
		const reqUrl = this._proxyUrl ? url.replace(/^[^:]+:\/\/[^/]+/, this._proxyUrl) : url;
		const jsonClient = this.client();
		const req = jsonClient(reqUrl)
			.on("beforesend", request => {
				if (auth && auth.signingKeyValid) {
					auth.reset()
						.snDate(true)
						.url(url);
					request.setRequestHeader(HttpHeaders.X_SN_DATE, auth.requestDateHeaderValue);
					request.setRequestHeader(HttpHeaders.AUTHORIZATION, auth.buildWithSavedKey());
				}
			})
			.on("load", json => {
				let dataArray = datumExtractor(json);
				if (dataArray === undefined) {
					log.debug("No data available for %s", reqUrl);
					this.handleResults();
					return;
				}

				const incMode = this._incrementalMode;
				const nextOffset = offsetExtractor(json, pagination);
				const totalResults = json.data ? json.data.totalResults : null;

				if (this._results === undefined || incMode) {
					this._results = dataArray;

					// discover page size, if pagination does not already have one
					if (pagination.max < 1) {
						const max = pageSizeExtractor(json);
						if (max > 0) {
							pagination = new Pagination(max, pagination.offset);
						}
					}
					if (incMode) {
						this.handleResults(undefined, nextOffset < 1, pagination);
					}
				} else if (!q) {
					this._results = this._results.concat(dataArray);
				}

				// see if we need to load more results
				if (nextOffset > 0 || (q && pagination.offset > 0)) {
					if (q) {
						if (totalResults > 0) {
							// parallel mode with first page results; queue all remaining pages
							for (
								let pOffset = nextOffset;
								pOffset < totalResults;
								pOffset += pagination.max
							) {
								this.loadData(pagination.withOffset(pOffset));
							}
							q.awaitAll((error, allResults) => {
								if (!error) {
									allResults
										.map(function(qJson) {
											return datumExtractor(qJson) || [];
										})
										.forEach(resultArray => {
											this._results = this._results.concat(resultArray);
										});
								}
								this.handleResults(error !== null ? error : undefined, true);
							});
						}
					} else {
						this.loadData(pagination.withOffset(nextOffset));
					}
				} else if (!incMode) {
					this.handleResults(undefined, true);
				}
			})
			.on("error", error => {
				log.error("Error requesting data for %s: %s", reqUrl, error);
				this.handleResults(new Error(`Error requesting data for ${reqUrl}: ${error}`));
			});
		if (q && pagination.offset > 0) {
			q.defer(req.get, null);
		} else {
			req.get();
		}
	}
}

/**
 * Extract the datum list from the returned data.
 *
 * @param {object} json the JSON results to extract from
 * @returns {Datum[]} the extracted data
 * @private
 */
function datumExtractor(json) {
	if (
		json.success !== true ||
		json.data === undefined ||
		Array.isArray(json.data.results) !== true
	) {
		return undefined;
	}
	return json.data.results;
}

/**
 * Extract the page size from the returned data.
 *
 * @param {object} json the JSON results to extract from
 * @returns {number} the extracted page size
 * @private
 */
function pageSizeExtractor(json) {
	const data = json.data;
	return data.returnedResultCount + data.startingOffset < data.totalResults
		? data.returnedResultCount
		: 0;
}

/**
 * Extract the "next" offset to use based on the returned data.
 *
 * If `page` is supplied, then pagination will be based on `page.max` and will continue
 * until less than that many results are returned. If `page` is not supplied, then
 * pagination will be based on `data.returnedResultCount` and will continue until
 * `data.totalResults` has been returned.
 *
 * @param {object} json the JSON results to extract from
 * @param {Pagination} [page] the incremental mode page
 * @returns {number} the extracted offset, or `0` if no more pages to return
 * @private
 */
function offsetExtractor(json, page) {
	const data = json.data;
	if (page && page.max) {
		// don't bother with totalResults; just keep going unless returnedResultCount < page.max
		return data.returnedResultCount < page.max ? 0 : data.startingOffset + page.max;
	}
	return data.returnedResultCount + data.startingOffset < data.totalResults
		? data.returnedResultCount + data.startingOffset
		: 0;
}

export default DatumLoader;
