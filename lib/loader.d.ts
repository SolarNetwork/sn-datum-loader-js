import { Pagination } from "solarnetwork-api-core/lib/domain/index.js";
/**
 * General SolarNetwork datum interface.
 */
export interface Datum {
    created: string;
    sourceId: string;
    [index: string]: any;
}
/**
 * The data callback function.
 */
export type LoaderDataCallbackFn<T> = (
/** An error if a failure occurred. */
error?: Error, 
/** The result data. */
data?: T, 
/** In incremental mode, will be `true` when invoked on the *last* page of data. */
done?: boolean, 
/**  In incremental mode, the page associated with the data. */
page?: Pagination) => void;
/**
 * API for a loader.
 */
export interface Loader<T> {
    /**
     * Initiate loading the data.
     *
     * @param callback the callback function to provide the results to
     */
    load(callback: LoaderDataCallbackFn<T>): any;
}
//# sourceMappingURL=loader.d.ts.map