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

        /** @type {function} */
        this.finishedCallback = undefined;

        /** @type {object} */
		this.urlParameters = undefined;
		
        /** @type {json} */
        this.jsonClient = json;

		/** @type {number} */
		this._state = 0;

		/** @type {Datum[]} */
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
	 * function will be passed two arguments: an error and the results.
	 *
	 * @param {function} [value] the callback function to use
	 * @returns  {function|DatumLoader} when used as a getter, the current callback function, otherwise this object
	 */
	callback(value) {
		if ( !value ) { return this.finishedCallback; }
		if ( typeof value === 'function' ) {
			this.finishedCallback = value;
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
		if ( !value ) return this.urlParameters;
		if ( typeof value === 'object' ) {
			this.urlParameters = value;
		}
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
			this.finishedCallback = callback;
		}
		this._state = 1;
		this.loadData();
		return this;
	}

	/**
	 * Invoke the configured callback function.
	 * 
	 * @param {Error} [error] an optional  error
	 * @returns {void}
	 * @private
	 */
	requestCompletionHandler(error) {
		this._state = 2; // done

		// check if we're all done loading, and if so call our callback function
		if ( this.finishedCallback ) {
			this.finishedCallback.call(this, error, this._results);
		}
	}

	/**
	 * Load a single page of data, starting at a specific offset.
	 * 
	 * @param {Pagination} [page] the page to load
	 * @returns {void}
	 */
	loadData(page) {
		let pagination = (page instanceof Pagination ? page : new Pagination());
		let url = this.urlHelper.listDatumUrl(this.filter, undefined, pagination);
		if ( this.urlParameters ) {
			let queryParams = urlQuery.urlQueryEncode(this.urlParameters);
			if ( queryParams ) {
				url += '&' + queryParams;
			}
		}
		this.jsonClient(url).on('load', (json) => {
			let dataArray = datumExtractor(json);
			if ( dataArray === undefined ) {
				log.debug('No data available for %s', url);
				this.requestCompletionHandler();
				return;
			}

			if ( this._results === undefined ) {
				this._results = dataArray;
			} else {
				this._results = this._results.concat(dataArray);
			}

			// see if we need to load more results
			let nextOffset = offsetExtractor(json);
			if ( nextOffset > 0 ) {
				this.loadData(pagination.withOffset(nextOffset));
			} else {
				this.requestCompletionHandler();
			}
		}).on('error', (error) => {
			log.error('Error requesting data for %s: %s', url, error);
			this.requestCompletionHandler(error);
		})
		.get();
	}

}

/**
 * Extract the datum list from the returned data.
 * 
 * @param {object} json the JSON results to extract from
 * @returns {Datum[]} the extracted data 
 */

function datumExtractor(json) {
	if ( json.success !== true || json.data === undefined || Array.isArray(json.data.results) !== true ) {
		return undefined;
	}
	return json.data.results;
}

/**
 * Extract the "next" offset to use based on the returned data.
 * 
 * @param {object} json the JSON results to extract from
 * @returns {number} the extracted offset 
 */
function offsetExtractor(json) {
	return (json.data.returnedResultCount + json.data.startingOffset < json.data.totalResults
			? (json.data.returnedResultCount + json.data.startingOffset)
			: 0);
}

export default DatumLoader;
