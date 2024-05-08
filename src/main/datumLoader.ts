import { Queue, queue } from "d3-queue";
import {
	DatumFilter,
	DatumReadingTypes,
	Pagination,
} from "solarnetwork-api-core/lib/domain/index.js";
import { Logger as log } from "solarnetwork-api-core/lib/util/index.js";
import {
	AuthorizationV2Builder,
	SolarQueryApi,
	Urls,
} from "solarnetwork-api-core/lib/net/index.js";
import { default as JsonClientSupport } from "./jsonClientSupport.js";
import { Datum, LoaderDataCallbackFn, Loader } from "./loader.js";

/**
 * Query results data.
 */
interface QueryResultsData {
	totalResults?: number;
	returnedResultCount: number;
	startingOffset: number;
	results?: Datum[];
}

const DEFAULT_PAGE_SIZE: number = 1000;

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
 * @version 2.0.0
 */
class DatumLoader
	extends JsonClientSupport<Datum[]>
	implements Loader<Datum[]>
{
	/** The filter. */
	readonly filter: DatumFilter;

	#pageSize: number;
	#includeTotalResultsCount: boolean;
	#callback: LoaderDataCallbackFn<Datum[]> | null;
	#urlParameters: object | null;

	/**
	 * When `true` then call the callback function for every page of data as it becomes available.
	 * Otherwise the callback function will be invoked only after all data has been loaded.
	 */
	#incrementalMode: boolean;

	/**
	 * When `true` then invoke the `/datum/reading` endpoint to load data, otherwise use `/datum/list`.
	 */
	#readingsMode: boolean;

	/**
	 * An optional proxy URL to use instead of the host returned by the configured `SolarQueryApi`.
	 * This should be configured as an absolute URL to the proxy target, e.g. `https://query.solarnetwork.net/1m`.
	 */
	#proxyUrl: string | null;

	/**
	 * When > 0 then make one request that includes the total result count and first page of
	 * results, followed by parallel requests for the remaining pages.
	 */
	#concurrency: number;

	/**
	 * A queue to use for parallel mode, when `concurrency` configured > 0.
	 */
	#queue?: Queue;

	#state: number;

	#results?: Datum[];

	#promise?: Promise<Datum[]>;

	/**
	 * Constructor.
	 *
	 * @param urlHelper a URL helper for accessing node datum via SolarQuery
	 * @param filter the filter parameters to use
	 * @param authBuilder the auth builder to authenticate requests with; if not provided
	 *                    then only public data can be queried; when provided a pre-signed
	 *                    key must be available
	 */
	constructor(
		api: SolarQueryApi,
		filter: DatumFilter,
		authBuilder?: AuthorizationV2Builder
	) {
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
		this.#state = 0;
	}

	/**
	 * Get the concurrency limit to use for parallel requests.
	 *
	 * @returns the current concurrency value
	 */
	concurrency(): number;

	/**
	 * Set the concurrency limit to use for parallel requests.
	 *
	 * By default requests are not made in parallel (this property is configured as `0`). Change
	 * to a positive number to enable parallel query mode.
	 *
	 * When parallel mode is enabled the loader will make one request that includes
	 * the total result count and first page of results, followed by parallel requests for any remaining pages
	 * based on that total result count and configured page size.
	 *
	 * @param value the concurrency level to use, or `Infinity` for no limit
	 * @returns this object
	 */
	concurrency(value: number): this;

	concurrency(value?: number): number | this {
		if (value === undefined) {
			return this.#concurrency;
		}
		if (!isNaN(value) && Number(value) > 0) {
			this.#concurrency = Number(value);
		}
		return this;
	}

	/**
	 * Get the optional callback function.
	 *
	 * @returns the current callback function or `null` if not defined
	 */
	callback(): LoaderDataCallbackFn<Datum[]> | null;

	/**
	 * Set the callback function, invoked after all data has been loaded or after every result
	 * page in incremental mode.
	 *
	 * The callback function will be passed a minimum of two arguments: an error and the results.
	 * In incremental mode, the callback will also be passed a boolean that will be `true` on that
	 * last page of data, and a `Pagination` that details which page the callback represents.
	 *
	 * @param value the callback function to use, or `null` to remove the existing callback function
	 * @returns this object
	 */
	callback(value: LoaderDataCallbackFn<Datum[]> | null): this;

	callback(
		value?: LoaderDataCallbackFn<Datum[]> | null
	): LoaderDataCallbackFn<Datum[]> | null | this {
		if (value === undefined) {
			return this.#callback;
		}
		if (value === null || typeof value === "function") {
			this.#callback = value;
		}
		return this;
	}

	/**
	 * Get the additional URL parameters.
	 *
	 * @returns the URL parameters, or `null`
	 */
	parameters(): object | null;

	/**
	 * Set additional URL parameters.
	 *
	 * The parameters are set as object properties.
	 * If a property value is an array, multiple parameters for that property will be added.
	 *
	 * @param value the URL parameters to include with the JSON request, or `null` to remove any existing parameters object
	 * @returns this object
	 */
	parameters(value: object | null): this;

	parameters(value?: object | null): object | null | this {
		if (value === undefined) {
			return this.#urlParameters;
		}
		if (value === null || typeof value === "object") {
			this.#urlParameters = value;
		}
		return this;
	}

	/**
	 * Get the _incremental mode_ for loading the data.
	 *
	 * @returns `true` if  incremental mode is enabled
	 */
	incremental(): boolean;

	/**
	 * Set _incremental mode_ for loading the data.
	 *
	 * When incremental mode is enabled (set to `true`) then the callback function will be invoked
	 * for _each result page_ that is loaded. The function will be passed a second `boolean` argument
	 * that will be set to `true` only on the last page of result data, and a third Pagination`
	 * object argument that details the starting offset of the page.
	 *
	 * When incremental mode is disabled (set to `false`, the default) then all result pages are
	 * combined into a single array and the callback will be invoked just once.
	 *
	 * @param value `true` to enable incremental mode
	 * @returns this object
	 */
	incremental(value: boolean): this;

	incremental(value?: boolean): boolean | this {
		if (value === undefined) {
			return this.#incrementalMode;
		}
		this.#incrementalMode = !!value;
		return this;
	}

	/**
	 * Get the result pagination size.
	 *
	 * @returns the pagination size; defaults to `1000`
	 */
	paginationSize(): number;

	/**
	 * Set the result pagination size.
	 *
	 * @param value the pagination size to set
	 * @returns this object
	 */
	paginationSize(value: number): this;

	paginationSize(value?: number): number | this {
		if (value === undefined) {
			return this.#pageSize;
		} else if (isNaN(Number(value))) {
			value = DEFAULT_PAGE_SIZE;
		}
		this.#pageSize = value;
		return this;
	}

	/**
	 * Get the flag for requesting the total results count.
	 *
	 * By default the datum loader will _not_ request the overal total result count when querying
	 * for data, as this speeds up queries. By setting this to `true` the total result count will
	 * be requested on the _first_ query page.
	 *
	 * @returns the total results count inclusion mode
	 */
	includeTotalResultsCount(): boolean;

	/**
	 * Set the flag for requesting the total results count.
	 *
	 * By default the datum loader will _not_ request the overal total result count when querying
	 * for data, as this speeds up queries. By setting this to `true` the total result count will
	 * be requested on the _first_ query page.
	 *
	 * @param value the flag to include total results count
	 * @returns this object
	 */
	includeTotalResultsCount(value: boolean): this;

	includeTotalResultsCount(value?: boolean): boolean | this {
		if (value === undefined) {
			return this.#includeTotalResultsCount;
		}
		this.#includeTotalResultsCount = !!value;
		return this;
	}

	/**
	 * Get the _readings mode_ for loading the data.
	 *
	 * @returns `true` to return reading query, `false` for list query
	 */
	readings(): boolean;

	/**
	 * Set the _readings mode_ for loading the data.
	 *
	 * When readings mode is enabled (set to `true`) then the `/datum/reading` endpoint will be invoked
	 * to load data.
	 *
	 * When readings mode is disabled (set to `false`, the default) then the `/datum/list` endpoint will
	 * be invoked to load data.
	 *
	 * @param value `true` to return reading query, `false` for list query
	 * @returns this object
	 */
	readings(value: boolean): this;

	readings(value?: boolean): boolean | this {
		if (value === undefined) {
			return this.#readingsMode;
		}
		this.#readingsMode = !!value;
		return this;
	}

	/**
	 * Get or set the URL to a proxy to use for loading the data.
	 *
	 * This can be configured as an absolute URL to the proxy server to use instead of making requests
	 * directly to the URL returned by the configured `SolarQueryApi`. For example:
	 *
	 * * https://query.solarnetwork.net
	 * * https://query.solarnetwork.net/1m
	 *
	 * @param {string} [value] the proxy URL to set, or `null` or an empty string to not use any proxy
	 * @returns {string|DatumLoader} when used a a getter, the readings mode; otherwise this object
	 */
	proxyUrl(): string | null;

	proxyUrl(value: string | null): this;

	proxyUrl(value?: string | null): string | null | this {
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
	fetch(): Promise<Datum[]> {
		if (this.#incrementalMode) {
			throw new Error(
				"Incremental mode is not supported via fetch(), use load(callback) instead."
			);
		}
		return new Promise((resolve, reject) => {
			this.load((error, results) => {
				if (error) {
					reject(error);
				} else {
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
	load(callback?: LoaderDataCallbackFn<Datum[]>): this {
		// to support queue use, allow callback to be passed directly to this function
		if (typeof callback === "function") {
			this.#callback = callback;
		}
		if (!this.#callback) {
			throw new Error("No callback provided.");
		}
		this.#state = 1;
		if (this.#concurrency > 0) {
			this.#queue = queue(this.#concurrency);
		}

		this.#loadData(new Pagination(this.#pageSize, 0));
		return this;
	}

	/**
	 * Invoke the configured callback function.
	 *
	 * @param an optional  error
	 * @param done `true` if there is no more data to load
	 * @param page the incremental mode page
	 */
	#handleResults(error: Error | undefined, done: boolean, page?: Pagination) {
		if (done) {
			this.#state = 2; // done
		}

		if (this.#callback) {
			let args: [
				Error | undefined,
				Datum[] | undefined,
				boolean | undefined,
				Pagination | undefined,
			];
			if (this.#incrementalMode) {
				args = [error, this.#results, done, page];
			} else {
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
	#loadData(page: Pagination, q?: Queue): void {
		//const auth = this.authBuilder;
		const queryFilter = new DatumFilter(this.filter);
		queryFilter.withoutTotalResultsCount =
			(this.#includeTotalResultsCount || q) && page.offset === 0
				? false
				: true;

		let url = this.#readingsMode
			? this.api.datumReadingUrl(
					DatumReadingTypes.Difference,
					queryFilter,
					undefined,
					undefined,
					page
			  )
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

		const query = this.requestor<QueryResultsData>(reqUrl, url);

		const handler = (error?: Error, data?: QueryResultsData) => {
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
			const totalResults: number =
				data && data.totalResults !== undefined ? data.totalResults : 0;

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
					for (
						let pOffset = nextOffset;
						pOffset < totalResults;
						pOffset += page.max
					) {
						this.#loadData(page.withOffset(pOffset), this.#queue);
					}
					this.#queue.awaitAll((error, allResults) => {
						const queryResults = allResults as QueryResultsData[];
						if (
							!error &&
							queryResults &&
							queryResults.findIndex((el) => el === undefined) >=
								0
						) {
							// some result is unexpectedly undefined; seen this under Node from
							// https://github.com/driverdan/node-XMLHttpRequest/issues/162
							// where the HTTP client lib is not reporting back an actual error value
							// when something happens like a response timeout
							error = new Error(
								"One or more requests did not return a result, but no error was reported."
							);
						}
						if (!error && queryResults) {
							queryResults.forEach((queryResult) => {
								const dataArray = datumExtractor(queryResult);
								if (!dataArray) {
									return;
								}
								if (!this.#results) {
									this.#results = dataArray;
								} else {
									this.#results =
										this.#results.concat(dataArray);
								}
							});
						}
						this.#handleResults(
							error !== null ? error : undefined,
							true
						);
					});
				} else {
					// serially move to next page
					this.#loadData(page.withOffset(nextOffset));
				}
			}
		};

		if (q) {
			q.defer(query);
		} else {
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
function datumExtractor(data?: QueryResultsData): Datum[] | undefined {
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
function offsetExtractor(
	data: QueryResultsData | undefined,
	page: Pagination
): number {
	if (!data) {
		return 0;
	}
	// don't bother with totalResults; just keep going unless returnedResultCount < page.max
	return data.returnedResultCount < page.max
		? 0
		: data.startingOffset + page.max;
}

export default DatumLoader;
