import { queue } from "d3-queue";
import { Datum, Loader } from "./loader.js";

/**
 * The data callback function.
 */
export type MultiLoaderDataCallbackFn = (
	/** An error if a failure occurred. */
	error?: Error,

	/** The result data. */
	data?: Datum[][]
) => void;

/**
 * Load data from multiple {@link Loader} objects, invoking a callback function
 * after all data has been loaded. Call {@link MultiLoader#load} to start loading the data.
 *
 * The {@link DatumLoader} class conforms to the {@link Loader} interface, so can be used to
 * load arrays of {@link Datum} objects based on search criteria.
 *
 * @example
 * const filter1 = new DatumFilter();
 * filter1.nodeId = 123;
 * // configure other filter settings here...
 *
 * const filter2 = new DatumFilter();
 * filter2.nodeId = 234;
 * // configure other filter settings here
 *
 * const api = new SolarQueryApi();
 *
 * const results = await new MultiLoader([
 *   new DatumLoader(api, filter1),
 *   new DatumLoader(api, filter2),
 * ]).fetch();
 * // results is a 2-element array of Datum arrays
 *
 * @version 2.0.0
 */
class MultiLoader {
	#loaders: Loader<Datum[]>[];
	#finishedCallback?: MultiLoaderDataCallbackFn;
	#concurrency: number;

	/**
	 * Constructor.
	 *
	 * @param loaders - array of loader objects
	 */
	constructor(loaders: Loader<Datum[]>[]) {
		this.#loaders = loaders;
		this.#concurrency = Infinity;
	}

	/**
	 * Get the concurrency limit to use for parallel requests.
	 *
	 * @returns the current concurrency value; defaults to `Infinity`
	 */
	concurrency(): number;

	/**
	 * Set the concurrency limit to use for parallel loading.
	 *
	 * By default loaders are executed in parallel. Change to a positive number to control the concurrency
	 * of the loader execution, for example set to `1` for serial execution.
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
	 * Asynchronously load the data.
	 *
	 * This method calls {@link MultiLoader#load} to perform the actual work.
	 *
	 * @returns {Promise<Datum[][]>} the result promise
	 */
	fetch(): Promise<Datum[][]> {
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
	 * This will call {@link Loader#load} on each supplied loader, in parallel.
	 *
	 * @param callback a callback function to use
	 * @returns this object
	 */
	load(callback: MultiLoaderDataCallbackFn) {
		// to support queue use, allow callback to be passed directly to this function
		if (typeof callback === "function") {
			this.#finishedCallback = callback;
		}
		const q = queue(this.#concurrency);
		this.#loaders.forEach((loader) => {
			// queue.defer will invoke the callback with a `null` `this` object, so `e.load.bind` here
			q.defer(loader.load.bind(loader));
		});
		q.awaitAll((error, results) => {
			if (this.#finishedCallback) {
				this.#finishedCallback.call(this, error, results);
			}
		});
		return this;
	}
}

export default MultiLoader;
