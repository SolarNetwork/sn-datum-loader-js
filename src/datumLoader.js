import { json } from 'd3-request';
import {
	DatumFilter,
	Logger as log,
	NodeDatumUrlHelper,
	Pagination,
	urlQuery,
} from 'solarnetwork-api-core';

/**
 * @typedef {Object} Datum
 * @property {string} created the datum date
 * @property {string} sourceId the control ID
 */

/**
 * The data callback function.
 * 
 * @callback DatumLoader~dataCallback
 * @param {Datum[]} data the result data
 * @param {boolean} [done] in incremental mode, will be `true` when invoked on the *last* page of data
 * @param {Pagination} [page] in incremental mode, the page associated with the data
 */

/**
 * Load data for a set of source IDs, date range, and aggregate level using the `listDatumUrl()` endpoint
 * of `NodeDatumUrlHelperMixin`.
 * 
 * This object is designed to be used once per query. After creating the object and configuring an
 * asynchronous callback function with {@link DatumLoader#callback}, call {@link DatumLoader#load}
 * to startloading the data. The callback function will be called once all data has been loaded. The
 * callback function can also be passed as an argument to the {@link DatumLoader#load} method directly.
 */
class DatumLoader {

	/**
	 * Constructor.
	 * 
     * @param {NodeDatumUrlHelperMixin} urlHelper a URL helper for accessing node datum via SolarQuery
	 * @param {DatumFilter} filter the filter parameters to use
	 * @param {AuthorizationV2Builder} [authBuilder] the auth builder to authenticate requests with; if not provided
	 *                                               then only public data can be queried
	 */
    constructor(urlHelper, filter, authBuilder) {

		/** @type {NodeDatumUrlHelper} */
		this.urlHelper = urlHelper || new NodeDatumUrlHelper();

		/** @type {DatumFilter} */
		this.filter = filter || new DatumFilter({nodeIds:this.urlHelper.nodeIds});

		/** @type {AuthorizationV2Builder} */
		this.authBuilder = authBuilder;

        /**
		 * @type {dataCallback}
		 * @private
		 */
        this._finishedCallback = undefined;

        /**
		 * @type {object}
		 * @private
		 */
		this._urlParameters = undefined;
		
        /**
		 * @type {json}
		 * @private
		 */
		this.jsonClient = json;
		
		/**
		 * When `true` then call the callback function for every page of data as it becomes available.
		 * Otherwise the callback function will be invoked only after all data has been loaded.
		 * @type {boolean}
		 * @private
		 */
		this._incrementalMode = false;

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
	 * Get or set a JSON client function to use. The function must be compatible with `d3.json`
	 * and defaults to that.
	 *
	 * @param {function} [value] the JSON client function, compatible with `d3.json`
	 * @returns {function|DatumLoader} when used as a getter, the JSON client function, otherwise this object
	 */
	client(value) {
        if ( !value ) return this.jsonClient;
		if ( typeof value === 'function' ) {
			this.jsonClient = value;
		}
		return this;
	}

	/**
	 * Get or set the callback function, invoked after all data has been loaded. The callback
	 * function will be passed two arguments: an error and the results. In incremental mode,
	 * the callback will also be passed a boolean that will be `true` on that last page of data,
	 * and a `Pagination` that details which page the callback represents.
	 *
	 * @param {dataCallback} [value] the callback function to use
	 * @returns  {dataCallback|DatumLoader} when used as a getter, the current callback function, otherwise this object
	 */
	callback(value) {
		if ( !value ) { return this._finishedCallback; }
		if ( typeof value === 'function' ) {
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
		if ( !value ) return this._urlParameters;
		if ( typeof value === 'object' ) {
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
		if ( value === undefined ) return this._incrementalMode;
		this._incrementalMode = !!value;
		return this;
	}

	/**
	 * Initiate loading the data.
	 * 
	 * As an alternative to configuring the callback function via the {@link DatumLoader#callback}
	 * method,a callback function can be passed as an argument to this function. That allows this
	 * function to be passed to things like `queue.defer`, for example.
	 *
	 * @param {function} [callback] a callback function to use; either this argument must be provided
	 *                              or the function must have already been configured via 
	 *                              {@link DatumLoader#callback}
	 * @returns {DatumLoader} this object
	 */
	load(callback) {
		// to support queue use, allow callback to be passed directly to this function
		if ( typeof callback === 'function' ) {
			this._finishedCallback = callback;
		}
		this._state = 1;
		this.loadData();
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
		if ( done ) {
			this._state = 2; // done
		}

		if ( this._finishedCallback ) {
			let args = [error, this._results];
			if ( this._incrementalMode ) {
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
		let pagination = (page instanceof Pagination ? page : new Pagination());
		let url = this.urlHelper.listDatumUrl(this.filter, undefined, pagination);
		if ( this._urlParameters ) {
			let queryParams = urlQuery.urlQueryEncode(this._urlParameters);
			if ( queryParams ) {
				url += '&' + queryParams;
			}
		}
		this.jsonClient(url).on('load', (json) => {
			let dataArray = datumExtractor(json);
			if ( dataArray === undefined ) {
				log.debug('No data available for %s', url);
				this.handleResults();
				return;
			}
			
			const incMode = this._incrementalMode;
			const nextOffset = offsetExtractor(json);

			if ( this._results === undefined || incMode ) {
				this._results = dataArray;
				
				// discover page size, if pagination does not already have one
				if ( pagination.max < 1 ) {
					const max = pageSizeExtractor(json);
					if ( max > 0 ) {
						pagination = new Pagination(max, pagination.offset);
					}
				}
				if ( incMode ) {
					this.handleResults(undefined, nextOffset < 1, pagination);
				}
			} else {
				this._results = this._results.concat(dataArray);
			}

			// see if we need to load more results
			if ( nextOffset > 0 ) {
				this.loadData(pagination.withOffset(nextOffset));
			} else if ( !incMode ) {
				this.handleResults(undefined, true);
			}
		}).on('error', (error) => {
			log.error('Error requesting data for %s: %s', url, error);
			this.handleResults(error);
		})
		.get();
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
	if ( json.success !== true || json.data === undefined || Array.isArray(json.data.results) !== true ) {
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
	return (data.returnedResultCount + data.startingOffset < data.totalResults
			? data.returnedResultCount
			: 0);
}

/**
 * Extract the "next" offset to use based on the returned data.
 * 
 * @param {object} json the JSON results to extract from
 * @returns {number} the extracted offset
 * @private
 */
function offsetExtractor(json) {
	const data = json.data;
	return (data.returnedResultCount + data.startingOffset < data.totalResults
			? (data.returnedResultCount + data.startingOffset)
			: 0);
}

export default DatumLoader;
