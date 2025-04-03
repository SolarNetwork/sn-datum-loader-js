import { DatumFilter } from "solarnetwork-api-core/lib/domain";
import { AuthorizationV2Builder, SolarQueryApi } from "solarnetwork-api-core/lib/net";
import { default as JsonClientSupport } from "./jsonClientSupport.js";
import { Datum, LoaderDataCallbackFn, Loader } from "./loader.js";
/**
 * An enumeration of loader state values.
 */
declare enum DatumLoaderState {
    /** The loader can be configured and is ready to be used. */
    Ready = 0,
    /** The loader is loading datum. */
    Loading = 1,
    /** The loader has finished loading datum. */
    Done = 2
}
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
declare class DatumLoader extends JsonClientSupport<Datum[]> implements Loader<Datum[]> {
    #private;
    /** The filter. */
    readonly filter: DatumFilter;
    /**
     * Constructor.
     *
     * @param api a URL helper for accessing node datum via SolarQuery
     * @param filter the filter parameters to use
     * @param authBuilder the auth builder to authenticate requests with; if not provided
     *                    then only public data can be queried; when provided a pre-signed
     *                    key must be available
     */
    constructor(api: SolarQueryApi, filter: DatumFilter, authBuilder?: AuthorizationV2Builder);
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
    /**
     * Get the loader state.
     *
     * @returns the state
     */
    state(): DatumLoaderState;
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
    /**
     * Get the URL to a proxy to use for loading the data.
     *
     * @returns the proxy URL
     */
    proxyUrl(): string | null;
    /**
     * Set the URL to a proxy to use for loading the data.
     *
     * This can be configured as an absolute URL to the proxy server to use instead of making requests
     * directly to the URL returned by the configured `SolarQueryApi`. For example:
     *
     * * https://query.solarnetwork.net
     * * https://query.solarnetwork.net/1m
     *
     * @param value the proxy URL to set, or `null` or an empty string to not use any proxy
     * @returns this object
     */
    proxyUrl(value: string | null): this;
    /**
     * Initiate loading the data.
     *
     * @returns a `Promise` for the final results
     */
    fetch(): Promise<Datum[]>;
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
    load(callback?: LoaderDataCallbackFn<Datum[]>): this;
}
export default DatumLoader;
export { DatumLoaderState };
//# sourceMappingURL=datumLoader.d.ts.map