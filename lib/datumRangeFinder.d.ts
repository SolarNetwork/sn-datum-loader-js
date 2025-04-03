import { DatumFilter } from "solarnetwork-api-core/lib/domain";
import { AuthorizationV2Builder, SolarQueryApi } from "solarnetwork-api-core/lib/net";
import { default as JsonClientSupport } from "./jsonClientSupport.js";
import { Loader, LoaderDataCallbackFn } from "./loader.js";
export interface DatumRangeResult {
    /** The local time zone of the node. */
    timeZone: string;
    /** The start of the time range, in milliseconds since the epoch. */
    startDateMillis: number;
    /** The end of the time range, in milliseconds since the epoch. */
    endDateMillis: number;
    /** The start of the time range. */
    startDate: string;
    /** The end of the time range. */
    endDate: string;
    /** The number of years in the range. */
    yearCount: number;
    /** The number of months in the range. */
    monthCount: number;
    /** The number of days in the range. */
    dayCount: number;
}
/**
 * A datum stream time range.
 */
export interface DatumRange extends DatumRangeResult {
    /** The start of the time range. */
    sDate: Date;
    /** The end of the time range. */
    eDate: Date;
    /** The raw ranges for each filter. */
    ranges: DatumRangeResult[];
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
declare class DatumRangeFinder extends JsonClientSupport<DatumRange> implements Loader<DatumRange> {
    #private;
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
    constructor(api: SolarQueryApi, filters: DatumFilter[] | DatumFilter, authBuilder?: AuthorizationV2Builder);
    /**
     * Initiate loading the data.
     *
     * @returns a `Promise` for the final results
     */
    fetch(): Promise<DatumRange>;
    /**
     * Asynchronously find the available datum range using a callback.
     *
     * @param callback the callback function to invoke with the results
     * @returns this object
     */
    load(callback: LoaderDataCallbackFn<DatumRange>): this;
}
export default DatumRangeFinder;
//# sourceMappingURL=datumRangeFinder.d.ts.map