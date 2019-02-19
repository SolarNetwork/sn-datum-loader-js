import { queue } from "d3-queue";

/**
 * Interface for classes that can be used to load data for {@link MultiLoader}.
 *
 * @interface Loader
 */

/**
 * The loader callback function.
 *
 * @callback Loader~dataCallback
 * @param {Error} [error] an error if a failure occurred
 * @param {Object} data the result data
 */

/**
 * Load data asynchronously with a callback.
 *
 * @function
 * @name Loader#load
 * @param {Loader~dataCallback} callback the callback to invoke with the results
 * @returns {Loader} the loader object
 */

/**
 * The data callback function.
 *
 * @callback MultiLoader~dataCallback
 * @param {Error} [error] an error if a failure occurred
 * @param {Object[]} data the result data from all loaders
 */

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
 * const urlHelper = new NodeDatumUrlHelper();
 *
 * new MultiLoader([
 *   new DatumLoader(urlHelper, filter1),
 *   new DatumLoader(urlHelper, filter2),
 * ]).load((error, results) => {
 *   // results is a 2-element array of Datum arrays
 * });
 *
 * @version 1.1.0
 */
class MultiLoader {
	/**
	 * Constructor.
	 *
	 * @param {Loader[]} loaders - array of loader objects
	 */
	constructor(loaders) {
		Object.defineProperties(this, {
			/**
			 * The class version.
			 *
			 * @memberof MultiLoader
			 * @readonly
			 * @type {string}
			 */
			version: { value: "1.1.0" }
		});

		/**
		 * @type {Loader[]}
		 * @private
		 */
		this._loaders = loaders;

		/**
		 * @type {MultiLoader~dataCallback}
		 * @private
		 */
		this._finishedCallback = undefined;

		/**
		 * @type {number}
		 * @private
		 */
		this._concurrency = Infinity;
	}

	/**
	 * Get or set the concurrency limit to use for requets.
	 *
	 * A default, infinite concurrency queue will be used by default.
	 *
	 * @param {number} [value] the concurrency level to use, or `Infinity` for no limit
	 * @returns {number|MultiLoader} when used as a getter, the current concurrency value, otherwise this object
	 * @since 1.1.0
	 */
	concurrency(value) {
		if (value === undefined) {
			return this._concurrency;
		}
		var n = Number(value);
		if (!isNaN(value) && n > 0) {
			this._concurrency = n;
		}
		return this;
	}

	/**
	 * Asynchronously load the data.
	 *
	 * This method calls {@link MultiLoader#load} to perform the actual work.
	 *
	 * @returns {Promise<Object[]>} the result promise
	 */
	fetch() {
		return new Promise((resolve, reject) => {
			this.load((error, results) => {
				if (error) {
					reject(error);
				} else {
					resolve(results);
				}
			});
		});
	}

	/**
	 * Initiate loading the data. This will call {@link Loader#load} on each
	 * supplied loader, in parallel. As an alternative to configuring the callback function via
	 * the {@link MultiLoader#callback} method, a callback function can be passed as an argument
	 * to this function. This allows this function to be passed to `queue.defer`, for example.
	 *
	 * @param {MultiLoader~dataCallback} [callback] a callback function to use; either this argument must be provided
	 *                              or the function must have already been configured via  {@link MultiLoader#callback}
	 * @returns {MultiLoader} this object
	 */
	load(callback) {
		// to support queue use, allow callback to be passed directly to this function
		if (typeof callback === "function") {
			this._finishedCallback = callback;
		}
		const q = queue(this._concurrency);
		this._loaders.forEach(loader => {
			// queue.defer will invoke the callback with a `null` `this` object, so `e.load.bind` here
			q.defer(loader.load.bind(loader));
		});
		q.awaitAll((error, results) => {
			if (this._finishedCallback) {
				this._finishedCallback.call(this, error, results);
			}
		});
		return this;
	}

	/**
	 * Get or set the callback function, invoked after all data has been loaded. The callback
	 * function will be passed two arguments: an error and the results as an array of results
	 * from each configured {@link Loader}.
	 *
	 * @param {MultiLoader~dataCallback} [value] the callback function to use
	 * @returns  {MultiLoader~dataCallback|MultiLoader} when used as a getter, the current callback function, otherwise this object
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
}

export default MultiLoader;
