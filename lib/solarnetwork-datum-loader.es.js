// https://github.com/SolarNetwork/sn-datum-loader-js Version 0.1.0. Copyright 2017 Matt Magoffin.
import { json } from 'd3-request';
import { DatumFilter, HttpHeaders, Logger, NodeDatumUrlHelper, Pagination, urlQuery } from 'solarnetwork-api-core';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};











var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

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

var DatumLoader = function () {

	/**
  * Constructor.
  * 
     * @param {NodeDatumUrlHelperMixin} urlHelper a URL helper for accessing node datum via SolarQuery
  * @param {DatumFilter} filter the filter parameters to use
  * @param {AuthorizationV2Builder} [authBuilder] the auth builder to authenticate requests with; if not provided
  *                                               then only public data can be queried
  */
	function DatumLoader(urlHelper, filter, authBuilder) {
		classCallCheck(this, DatumLoader);


		/** @type {NodeDatumUrlHelper} */
		this.urlHelper = urlHelper || new NodeDatumUrlHelper();

		/** @type {DatumFilter} */
		this.filter = filter || new DatumFilter({ nodeIds: this.urlHelper.nodeIds });

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


	createClass(DatumLoader, [{
		key: 'client',
		value: function client(value) {
			if (!value) return this.jsonClient;
			if (typeof value === 'function') {
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

	}, {
		key: 'callback',
		value: function callback(value) {
			if (!value) {
				return this._finishedCallback;
			}
			if (typeof value === 'function') {
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

	}, {
		key: 'parameters',
		value: function parameters(value) {
			if (!value) return this._urlParameters;
			if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
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

	}, {
		key: 'incremental',
		value: function incremental(value) {
			if (value === undefined) return this._incrementalMode;
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

	}, {
		key: 'load',
		value: function load(callback) {
			// to support queue use, allow callback to be passed directly to this function
			if (typeof callback === 'function') {
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

	}, {
		key: 'handleResults',
		value: function handleResults(error, done, page) {
			if (done) {
				this._state = 2; // done
			}

			if (this._finishedCallback) {
				var args = [error, this._results];
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

	}, {
		key: 'loadData',
		value: function loadData(page) {
			var _this = this;

			var pagination = page instanceof Pagination ? page : new Pagination();
			var url = this.urlHelper.listDatumUrl(this.filter, undefined, pagination);
			if (this._urlParameters) {
				var queryParams = urlQuery.urlQueryEncode(this._urlParameters);
				if (queryParams) {
					url += '&' + queryParams;
				}
			}
			var authBuilder = this.authBuilder;
			this.jsonClient(url).on('beforesend', function (request) {
				if (!authBuilder) {
					return;
				}
				authBuilder.reset().snDate(true).url(url);
				request.setRequestHeader(HttpHeaders.X_SN_DATE, authBuilder.requestDateHeaderValue);
				request.setRequestHeader(HttpHeaders.AUTHORIZATION, authBuilder.buildWithSavedKey());
			}).on('load', function (json$$1) {
				var dataArray = datumExtractor(json$$1);
				if (dataArray === undefined) {
					Logger.debug('No data available for %s', url);
					_this.handleResults();
					return;
				}

				var incMode = _this._incrementalMode;
				var nextOffset = offsetExtractor(json$$1);

				if (_this._results === undefined || incMode) {
					_this._results = dataArray;

					// discover page size, if pagination does not already have one
					if (pagination.max < 1) {
						var max = pageSizeExtractor(json$$1);
						if (max > 0) {
							pagination = new Pagination(max, pagination.offset);
						}
					}
					if (incMode) {
						_this.handleResults(undefined, nextOffset < 1, pagination);
					}
				} else {
					_this._results = _this._results.concat(dataArray);
				}

				// see if we need to load more results
				if (nextOffset > 0) {
					_this.loadData(pagination.withOffset(nextOffset));
				} else if (!incMode) {
					_this.handleResults(undefined, true);
				}
			}).on('error', function (error) {
				Logger.error('Error requesting data for %s: %s', url, error);
				_this.handleResults(new Error('Error requesting data for ' + url + ': ' + error));
			}).get();
		}
	}]);
	return DatumLoader;
}();

/**
 * Extract the datum list from the returned data.
 * 
 * @param {object} json the JSON results to extract from
 * @returns {Datum[]} the extracted data
 * @private
 */

function datumExtractor(json$$1) {
	if (json$$1.success !== true || json$$1.data === undefined || Array.isArray(json$$1.data.results) !== true) {
		return undefined;
	}
	return json$$1.data.results;
}

/**
 * Extract the page size from the returned data.
 * 
 * @param {object} json the JSON results to extract from
 * @returns {number} the extracted page size
 * @private
 */
function pageSizeExtractor(json$$1) {
	var data = json$$1.data;
	return data.returnedResultCount + data.startingOffset < data.totalResults ? data.returnedResultCount : 0;
}

/**
 * Extract the "next" offset to use based on the returned data.
 * 
 * @param {object} json the JSON results to extract from
 * @returns {number} the extracted offset
 * @private
 */
function offsetExtractor(json$$1) {
	var data = json$$1.data;
	return data.returnedResultCount + data.startingOffset < data.totalResults ? data.returnedResultCount + data.startingOffset : 0;
}

export { DatumLoader };
//# sourceMappingURL=solarnetwork-datum-loader.es.js.map
