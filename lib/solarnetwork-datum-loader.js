// https://github.com/SolarNetwork/sn-datum-loader-js Version 0.10.6. Copyright 2020 SolarNetwork Foundation.
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3-queue'), require('solarnetwork-api-core'), require('d3-request')) :
  typeof define === 'function' && define.amd ? define(['exports', 'd3-queue', 'solarnetwork-api-core', 'd3-request'], factory) :
  (global = global || self, factory(global.sn = {}, global.d3, global.sn, global.d3));
}(this, function (exports, d3Queue, solarnetworkApiCore, d3Request) { 'use strict';

  function _typeof(obj) {
    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function (obj) {
        return typeof obj;
      };
    } else {
      _typeof = function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
    }

    return _typeof(obj);
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function");
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        writable: true,
        configurable: true
      }
    });
    if (superClass) _setPrototypeOf(subClass, superClass);
  }

  function _getPrototypeOf(o) {
    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
      return o.__proto__ || Object.getPrototypeOf(o);
    };
    return _getPrototypeOf(o);
  }

  function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
      o.__proto__ = p;
      return o;
    };

    return _setPrototypeOf(o, p);
  }

  function _assertThisInitialized(self) {
    if (self === void 0) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return self;
  }

  function _possibleConstructorReturn(self, call) {
    if (call && (typeof call === "object" || typeof call === "function")) {
      return call;
    }

    return _assertThisInitialized(self);
  }

  /**
   * The data callback function.
   *
   * @callback JsonClientSupport~dataCallback
   * @param {Error} [error] an error if a failure occurred
   * @param {*} data the result data
   */

  /**
   * An abstract class with customizable JSON client support.
   *
   * @abstract
   */

  var JsonClientSupport =
  /*#__PURE__*/
  function () {
    /**
     * Constructor.
     *
     * @param {AuthorizationV2Builder} [authBuilder] the auth builder to authenticate requests with; if not provided
     *                                               then only public data can be queried
     */
    function JsonClientSupport(authBuilder) {
      _classCallCheck(this, JsonClientSupport);

      /**
       * An authorization builder to use to make authenticated HTTP requests.
       * @type {AuthorizationV2Builder}
       * @protected
       */
      this.authBuilder = authBuilder;
      /**
       * The JSON client.
       * @private
       */

      this.jsonClient = d3Request.json;
    }
    /**
     * Get or set a JSON HTTP client function to use.
     *
     * The function must be compatible with `d3.json` and defaults to that. This provides a way
     * to integrate a different HTTP client if needed, for example a mock implementation in tests.
     *
     * @param {function} [value] the JSON client function, compatible with `d3.json`
     * @returns {function|DatumSourceFinder} when used as a getter, the JSON client function, otherwise this object
     */


    _createClass(JsonClientSupport, [{
      key: "client",
      value: function client(value) {
        if (!value) return this.jsonClient;

        if (typeof value === "function") {
          this.jsonClient = value;
        }

        return this;
      }
      /**
       * Asynchronously load the data.
       *
       * This method calls {@link JsonClientSupport#load} to perform the actual work.
       *
       * @returns {Promise<*>} the result promise
       */

    }, {
      key: "fetch",
      value: function fetch() {
        var _this = this;

        return new Promise(function (resolve, reject) {
          _this.load(function (error, results) {
            if (error) {
              reject(error);
            } else {
              resolve(results);
            }
          });
        });
      }
      /**
       * Asynchronously load the data using a callback.
       *
       * Extending classes must override this method to provide a useful implementation.
       *
       * @abstract
       * @param {JsonClientSupport~dataCallback} callback the callback function to invoke
       * @returns {void}
       */

    }, {
      key: "load",
      value: function load(callback) {
        callback(new Error("Abstract method must be implemented by subclass."));
      }
    }]);

    return JsonClientSupport;
  }();

  /**
   * @typedef {Object} DatumRange
   * @property {string} timeZone the local time zone of the node
   * @property {number} startDateMillis the start of the time range, in milliseconds since the epoch
   * @property {number} endDateMillis the end of the time range, in milliseconds since the epoch
   * @property {Date} sDate the start of the time range
   * @property {Date} eDate the end of the time range
   */

  /**
   * The data callback function.
   *
   * @callback DatumRangeFinder~dataCallback
   * @param {Error} [error] an error if a failure occurred
   * @param {DatumRange} data the result data
   */

  /**
   * Class to find the available datum date range for a set of node datum URL helpers.
   *
   * This is useful when generating reports or charts for a set of SolarNode datum streams,
   * so the overall start/end dates can be determined before requesting the actual data.
   * It returns an object starting and ending date related properties, for example:
   *
   * ```
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
   * @extends {JsonClientSupport}
   * @example
   * // the simple case, for just one SolarNode
   * const urlHelper = new NodeDatumUrlHelper();
   * urlHelper.publicQuery = true;
   * urlHelper.nodeId = 123;
   * urlHelper.sourceIds = ['a', 'b'];
   * const range = await new DatumRangeFinder(urlHelper).fetch();
   *
   * @example
   * // more complex case, for multiple SolarNode / source ID combinations
   * const urlHelper2 = new NodeDatumUrlHelper();
   * urlHelper2.publicQuery = true;
   * urlHelper2.nodeId = 234;
   * urlHelper2.sourceId = 'c';
   * const range2 = await new DatumRangeFinder([urlHelper, urlHelper2]).fetch();
   *
   * @example
   * // with authentication; note the authentication must be valid for all SolarNodes!
   * const auth = new AuthorizationV2Builder('my-token');
   * auth.saveSigningKey('secret');
   * urlHelper.publicQuery = false;
   * urlHelper2.publicQuery = false;
   * const range3 = await new DatumRangeFinder([urlHelper, urlHelper2], auth).fetch();
   */

  var DatumRangeFinder =
  /*#__PURE__*/
  function (_JsonClientSupport) {
    _inherits(DatumRangeFinder, _JsonClientSupport);

    /**
     * Constructor.
     *
     * @param {NodeDatumUrlHelper|NodeDatumUrlHelper[]} urlHelpers the helper(s) to find the avaialble data range for
     * @param {AuthorizationV2Builder} [authBuilder] the auth builder to authenticate requests with; if not provided
     *                                               then only public data can be queried; when provided a pre-signed
     *                                               key must be available
     */
    function DatumRangeFinder(urlHelpers, authBuilder) {
      var _this;

      _classCallCheck(this, DatumRangeFinder);

      _this = _possibleConstructorReturn(this, _getPrototypeOf(DatumRangeFinder).call(this, authBuilder));
      Object.defineProperties(_assertThisInitialized(_this), {
        /**
         * The class version.
         *
         * @memberof DatumRangeFinder
         * @readonly
         * @type {string}
         */
        version: {
          value: "1.0.0"
        }
      });
      /**
       * @type {NodeDatumUrlHelper[]}
       * @private
       */

      _this._helpers = Array.isArray(urlHelpers) ? urlHelpers : urlHelpers ? [urlHelpers] : [new solarnetworkApiCore.NodeDatumUrlHelper()];
      return _this;
    }
    /**
     * Asynchronously find the available datum range using a callback.
     *
     * @param {DatumRangeFinder~dataCallback} callback the callback function to invoke
     * @returns {void}
     */


    _createClass(DatumRangeFinder, [{
      key: "load",
      value: function load(callback) {
        var q = d3Queue.queue();
        var jsonClient = this.client();
        var auth = this.authBuilder;
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          var _loop = function _loop() {
            var urlHelper = _step.value;
            var url = urlHelper.reportableIntervalUrl();
            var req = jsonClient(url).on("beforesend", function (request) {
              if (auth && auth.signingKeyValid) {
                auth.reset().snDate(true).url(url, true);
                request.setRequestHeader(solarnetworkApiCore.HttpHeaders.X_SN_DATE, auth.requestDateHeaderValue);
                request.setRequestHeader(solarnetworkApiCore.HttpHeaders.AUTHORIZATION, auth.buildWithSavedKey());
              }
            });
            q.defer(req.get, null);
          };

          for (var _iterator = this._helpers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            _loop();
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return != null) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        q.awaitAll(function (error, results) {
          if (error) {
            solarnetworkApiCore.Logger.error("Error requesting available data range: %s", error);

            if (typeof callback === "function") {
              callback(error);
            }

            return;
          }

          var intervalObj = extractReportableInterval(results);

          if (intervalObj.startDateMillis !== undefined) {
            intervalObj.sDate = new Date(intervalObj.startDateMillis);
          }

          if (intervalObj.endDateMillis !== undefined) {
            intervalObj.eDate = new Date(intervalObj.endDateMillis);
          }

          if (typeof callback === "function") {
            callback(null, intervalObj);
          }
        });
      }
    }]);

    return DatumRangeFinder;
  }(JsonClientSupport);

  function extractReportableInterval(results) {
    var result,
        i = 0,
        repInterval;

    for (i = 0; i < results.length; i += 1) {
      repInterval = results[i];

      if (repInterval.data === undefined || repInterval.data.endDate === undefined) {
        solarnetworkApiCore.Logger.debug("No data available for %s sources %s", this._helpers[i].nodeId, this._helpers[i].sourceIds.join(","));
        continue;
      }

      repInterval = repInterval.data;

      if (result === undefined) {
        result = repInterval;
      } else {
        // merge start/end dates
        // note we don't copy the time zone... this breaks when the tz are different!
        if (repInterval.endDateMillis > result.endDateMillis) {
          result.endDateMillis = repInterval.endDateMillis;
          result.endDate = repInterval.endDate;
        }

        if (repInterval.startDateMillis < result.startDateMillis) {
          result.startDateMillis = repInterval.startDateMillis;
          result.startDate = repInterval.startDate;
        }
      }
    }

    return result;
  }

  /**
   * The data callback function.
   *
   * @callback DatumSourceFinder~dataCallback
   * @param {Error} [error] an error if a failure occurred
   * @param {object} data the result data, with node ID keys and `string[]` values representing the source IDs
   */

  /**
   * Class to find the available datum sources for a set of node datum URL helpers.
   *
   * This helper is useful for finding what source IDs are avaialble for a set of nodes.
   * It returns an object with node ID properties with associated source ID array values,
   * for example:
   *
   * ```
   * { 123: ["a", "b", "c"] }
   * ```
   * @extends {JsonClientSupport}
   * @example
   * // the simple case, all available sources for just one SolarNode
   * const urlHelper = new NodeDatumUrlHelper();
   * urlHelper.publicQuery = true;
   * urlHelper.nodeId = 123;
   * const sources = await new DatumSourceFinder(urlHelper).fetch();
   *
   * @example
   * // find all sources matching a wildcard pattern within the past day
   * const filter = new DatumFilter();
   * filter.startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
   * filter.sourceId = '/power/**';
   * const sources2 = await new DatumSourceFinder(urlHelper).filter(filter).fetch();
   *
   * @example
   * // find all sources across multiple SolarNodes
   * const urlHelper2 = new NodeDatumUrlHelper();
   * urlHelper2.publicQuery = true;
   * urlHelper2.nodeId = 234;
   * const sources3 = await new DatumSourceFinder([urlHelper, urlHelper2]).fetch();
   */

  var DatumSourceFinder =
  /*#__PURE__*/
  function (_JsonClientSupport) {
    _inherits(DatumSourceFinder, _JsonClientSupport);

    /**
     * Constructor.
     *
     * @param {NodeDatumUrlHelper|NodeDatumUrlHelper[]} urlHelpers the helper(s) to find the avaialble sources for
     * @param {AuthorizationV2Builder} [authBuilder] the auth builder to authenticate requests with; if not provided
     *                                               then only public data can be queried; when provided a pre-signed
     *                                               key must be available
     */
    function DatumSourceFinder(urlHelpers, authBuilder) {
      var _this;

      _classCallCheck(this, DatumSourceFinder);

      _this = _possibleConstructorReturn(this, _getPrototypeOf(DatumSourceFinder).call(this, authBuilder));
      Object.defineProperties(_assertThisInitialized(_this), {
        /**
         * The class version.
         *
         * @memberof DatumSourceFinder
         * @readonly
         * @type {string}
         */
        version: {
          value: "1.0.0"
        }
      });
      /**
       * @type {NodeDatumUrlHelper[]}
       * @private
       */

      _this._helpers = Array.isArray(urlHelpers) ? urlHelpers : urlHelpers ? [urlHelpers] : [new solarnetworkApiCore.NodeDatumUrlHelper()];
      return _this;
    }
    /**
     * Get or set a `DatumFilter` to limit the query with.
     *
     * The `startDate`, `endDate`, and `metadataFilter` properties can be used to limit the query scope.
     *
     * @param {DatumFilter} [value] the datum filter to use
     * @returns {function|DatumFilter} when used as a getter, the filter, otherwise this object
     */


    _createClass(DatumSourceFinder, [{
      key: "filter",
      value: function filter(value) {
        if (!value) return this.datumFilter;

        if (value instanceof solarnetworkApiCore.DatumFilter) {
          this.datumFilter = value;
        }

        return this;
      }
      /**
       * Asynchronously find the available datum range using a callback.
       *
       * @param {DatumSourceFinder~dataCallback} callback the callback function to invoke
       * @returns {void}
       */

    }, {
      key: "load",
      value: function load(callback) {
        var q = d3Queue.queue();
        var jsonClient = this.client();
        var auth = this.authBuilder;
        var requestKeys = [];

        function addRequest(key, url) {
          requestKeys.push(key);
          var req = jsonClient(url).on("beforesend", function (request) {
            if (auth && auth.signingKeyValid) {
              auth.reset().snDate(true).url(url, true);
              request.setRequestHeader(solarnetworkApiCore.HttpHeaders.X_SN_DATE, auth.requestDateHeaderValue);
              request.setRequestHeader(solarnetworkApiCore.HttpHeaders.AUTHORIZATION, auth.buildWithSavedKey());
            }
          });
          q.defer(req.get, null);
        }

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = this._helpers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var urlHelper = _step.value;
            var filter = new solarnetworkApiCore.DatumFilter(this.datumFilter);
            filter.nodeIds = urlHelper.nodeIds;

            if (filter.metadataFilter || filter.nodeIds.length === 1) {
              // when metadata filter used, multiple node IDs allowed
              addRequest(this.metadataFilter ? null : filter.nodeId, urlHelper.availableSourcesUrl(filter));
            } else {
              // no metadata filter, or multiple node IDs, so add one node ID at a time
              var _iteratorNormalCompletion4 = true;
              var _didIteratorError4 = false;
              var _iteratorError4 = undefined;

              try {
                for (var _iterator4 = filter.nodeIds[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                  var nodeId = _step4.value;
                  var oneFilter = new solarnetworkApiCore.DatumFilter(filter);
                  oneFilter.nodeId = nodeId;
                  addRequest(nodeId, urlHelper.availableSourcesUrl(oneFilter));
                }
              } catch (err) {
                _didIteratorError4 = true;
                _iteratorError4 = err;
              } finally {
                try {
                  if (!_iteratorNormalCompletion4 && _iterator4.return != null) {
                    _iterator4.return();
                  }
                } finally {
                  if (_didIteratorError4) {
                    throw _iteratorError4;
                  }
                }
              }
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return != null) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        q.awaitAll(function (error, results) {
          if (error) {
            solarnetworkApiCore.Logger.error("Error requesting available sources: %s", error);

            if (typeof callback === "function") {
              callback(error);
            }

            return;
          }

          var result = {};

          for (var i = 0, len = results.length; i < len; i += 1) {
            var data = Array.isArray(results[i].data) ? results[i].data : undefined;

            if (!data) {
              continue;
            }

            var key = requestKeys[i];

            if (key === null) {
              // result is array of nodeId/soruceId pairs, e.g. {nodeId:1, sourceId:"foo"}
              var _iteratorNormalCompletion2 = true;
              var _didIteratorError2 = false;
              var _iteratorError2 = undefined;

              try {
                for (var _iterator2 = data[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                  var pair = _step2.value;
                  var nodeIds = result[pair.nodeId];

                  if (!nodeIds) {
                    nodeIds = [];
                    result[pair.nodeId] = nodeIds;
                  }

                  if (nodeIds.indexOf(pair.sourceId) < 0) {
                    nodeIds.push(pair.sourceId);
                  }
                }
              } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
              } finally {
                try {
                  if (!_iteratorNormalCompletion2 && _iterator2.return != null) {
                    _iterator2.return();
                  }
                } finally {
                  if (_didIteratorError2) {
                    throw _iteratorError2;
                  }
                }
              }
            } else {
              // result is array of sourceIds
              var _nodeIds = result[key];

              if (!_nodeIds) {
                result[key] = data;
              } else {
                var _iteratorNormalCompletion3 = true;
                var _didIteratorError3 = false;
                var _iteratorError3 = undefined;

                try {
                  for (var _iterator3 = data[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var sourceId = _step3.value;

                    if (_nodeIds.indexOf(sourceId) < 0) {
                      _nodeIds.push(sourceId);
                    }
                  }
                } catch (err) {
                  _didIteratorError3 = true;
                  _iteratorError3 = err;
                } finally {
                  try {
                    if (!_iteratorNormalCompletion3 && _iterator3.return != null) {
                      _iterator3.return();
                    }
                  } finally {
                    if (_didIteratorError3) {
                      throw _iteratorError3;
                    }
                  }
                }
              }
            }
          }

          if (typeof callback === "function") {
            callback(null, result);
          }
        });
      }
    }]);

    return DatumSourceFinder;
  }(JsonClientSupport);

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

  var DatumLoader =
  /*#__PURE__*/
  function (_JsonClientSupport) {
    _inherits(DatumLoader, _JsonClientSupport);

    /**
     * Constructor.
     *
     * @param {NodeDatumUrlHelperMixin} urlHelper a URL helper for accessing node datum via SolarQuery
     * @param {DatumFilter} filter the filter parameters to use
     * @param {AuthorizationV2Builder} [authBuilder] the auth builder to authenticate requests with; if not provided
     *                                               then only public data can be queried; when provided a pre-signed
     *                                               key must be available
     */
    function DatumLoader(urlHelper, filter, authBuilder) {
      var _this;

      _classCallCheck(this, DatumLoader);

      _this = _possibleConstructorReturn(this, _getPrototypeOf(DatumLoader).call(this, authBuilder));
      Object.defineProperties(_assertThisInitialized(_this), {
        /**
         * The class version.
         *
         * @memberof DatumLoader
         * @readonly
         * @type {string}
         */
        version: {
          value: "1.2.0"
        }
      });
      /** @type {NodeDatumUrlHelper} */

      _this.urlHelper = urlHelper || new solarnetworkApiCore.NodeDatumUrlHelper();

      if (!authBuilder) {
        urlHelper.publicQuery = true;
      }
      /** @type {DatumFilter} */


      _this.filter = filter || new solarnetworkApiCore.DatumFilter({
        nodeIds: _this.urlHelper.nodeIds,
        withoutTotalResultsCount: true
      });
      /**
       * @type {number}
       * @private
       */

      _this._pageSize = 1000;
      /**
       * @type {boolean}
       * @private
       */

      _this._includeTotalResultsCount = false;
      /**
       * @type {DatumLoader~dataCallback}
       * @private
       */

      _this._finishedCallback = undefined;
      /**
       * @type {object}
       * @private
       */

      _this._urlParameters = undefined;
      /**
       * When `true` then call the callback function for every page of data as it becomes available.
       * Otherwise the callback function will be invoked only after all data has been loaded.
       * @type {boolean}
       * @private
       */

      _this._incrementalMode = false;
      /**
       * When `true` then invoke the `/datum/reading` endpoint to load data, otherwise use `/datum/list`.
       * @type {boolean}
       * @private
       */

      _this._readingsMode = false;
      /**
       * An optional proxy URL to use instead of the host returned by the configured `NodeDatumUrlHelperMixin`.
       * This should be configured as an absolute URL to the proxy target, e.g. `https://query.solarnetwork.net/1m`.
       * @type {string}
       * @private
       */

      _this._proxyUrl = undefined;
      /**
       * When > 0 then make one request that includes the total result count and first page of
       * results, followed by parallel requests for the remaining pages.
       * @type {number}
       * @private
       */

      _this._concurrency = 0;
      /**
       * A queue to use for parallel mode, when `concurrency` configured > 0.
       * @type {queue}
       * @private
       */

      _this._queue = null;
      /**
       * @type {number}
       * @private
       */

      _this._state = 0;
      /**
       * @type {Datum[]}
       * @private
       */

      _this._results = undefined;
      return _this;
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


    _createClass(DatumLoader, [{
      key: "concurrency",
      value: function concurrency(value) {
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

    }, {
      key: "callback",
      value: function callback(value) {
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

    }, {
      key: "parameters",
      value: function parameters(value) {
        if (!value) return this._urlParameters;

        if (_typeof(value) === "object") {
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
      key: "incremental",
      value: function incremental(value) {
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

    }, {
      key: "paginationSize",
      value: function paginationSize(value) {
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

    }, {
      key: "includeTotalResultsCount",
      value: function includeTotalResultsCount(value) {
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

    }, {
      key: "readings",
      value: function readings(value) {
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

    }, {
      key: "proxyUrl",
      value: function proxyUrl(value) {
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

    }, {
      key: "load",
      value: function load(callback) {
        // to support queue use, allow callback to be passed directly to this function
        if (typeof callback === "function") {
          this._finishedCallback = callback;
        }

        this._state = 1;

        if (this._concurrency > 0) {
          this._queue = d3Queue.queue(this._concurrency === Infinity ? null : this._concurrency);
        }

        this.loadData(new solarnetworkApiCore.Pagination(this._pageSize, 0));
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
      key: "handleResults",
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
      key: "loadData",
      value: function loadData(page) {
        var _this2 = this;

        var auth = this.authBuilder;
        var q = this._queue;
        var pagination = page instanceof solarnetworkApiCore.Pagination ? page : new solarnetworkApiCore.Pagination();
        var queryFilter = new solarnetworkApiCore.DatumFilter(this.filter);
        queryFilter.withoutTotalResultsCount = (this._includeTotalResultsCount || q) && pagination.offset === 0 ? false : true;
        var url = this._readingsMode ? this.urlHelper.datumReadingUrl(queryFilter, solarnetworkApiCore.DatumReadingTypes.Difference, undefined, undefined, pagination) : this.urlHelper.listDatumUrl(queryFilter, undefined, pagination);

        if (this._urlParameters) {
          var queryParams = solarnetworkApiCore.urlQuery.urlQueryEncode(this._urlParameters);

          if (queryParams) {
            url += "&" + queryParams;
          }
        }

        var reqUrl = this._proxyUrl ? url.replace(/^[^:]+:\/\/[^/]+/, this._proxyUrl) : url;
        var jsonClient = this.client();
        var req = jsonClient(reqUrl).on("beforesend", function (request) {
          if (auth && auth.signingKeyValid) {
            auth.reset().snDate(true).url(url, true);
            request.setRequestHeader(solarnetworkApiCore.HttpHeaders.X_SN_DATE, auth.requestDateHeaderValue);
            request.setRequestHeader(solarnetworkApiCore.HttpHeaders.AUTHORIZATION, auth.buildWithSavedKey());
          }
        }).on("load", function (json) {
          var dataArray = datumExtractor(json);

          if (dataArray === undefined) {
            solarnetworkApiCore.Logger.debug("No data available for %s", reqUrl);

            if (!q) {
              _this2.handleResults();

              return;
            }
          }

          var incMode = _this2._incrementalMode;
          var nextOffset = offsetExtractor(json, pagination);
          var totalResults = json && json.data ? json.data.totalResults : null;

          if (_this2._results === undefined || incMode) {
            _this2._results = dataArray; // discover page size, if pagination does not already have one

            if (pagination.max < 1) {
              var max = pageSizeExtractor(json);

              if (max > 0) {
                pagination = new solarnetworkApiCore.Pagination(max, pagination.offset);
              }
            }

            if (incMode) {
              _this2.handleResults(undefined, nextOffset < 1, pagination);
            }
          } else if (!q) {
            _this2._results = _this2._results.concat(dataArray);
          } // see if we need to load more results


          if (nextOffset > 0 || q && pagination.offset > 0) {
            if (q) {
              if (totalResults > 0) {
                // parallel mode with first page results; queue all remaining pages
                for (var pOffset = nextOffset; pOffset < totalResults; pOffset += pagination.max) {
                  _this2.loadData(pagination.withOffset(pOffset));
                }

                q.awaitAll(function (error, allResults) {
                  if (!error && allResults && allResults.findIndex(function (el) {
                    return el === undefined;
                  }) >= 0) {
                    // some result is unexpectedly undefined; seen this under Node from
                    // https://github.com/driverdan/node-XMLHttpRequest/issues/162
                    // where the HTTP client lib is not reporting back an actual error value
                    // when something happens like a response timeout
                    error = new Error("One or more requests did not return a result, but no error was reported.");
                  }

                  if (!error) {
                    allResults.map(function (qJson) {
                      return datumExtractor(qJson) || [];
                    }).forEach(function (resultArray) {
                      _this2._results = _this2._results.concat(resultArray);
                    });
                  }

                  _this2.handleResults(error !== null ? error : undefined, true);
                });
              }
            } else {
              _this2.loadData(pagination.withOffset(nextOffset));
            }
          } else if (!incMode) {
            _this2.handleResults(undefined, true);
          }
        }).on("error", function (error) {
          solarnetworkApiCore.Logger.error("Error requesting data for %s: %s", reqUrl, error);

          _this2.handleResults(new Error("Error requesting data for ".concat(reqUrl, ": ").concat(error)));
        });

        if (q && pagination.offset > 0) {
          q.defer(req.get, null);
        } else {
          req.get();
        }
      }
    }]);

    return DatumLoader;
  }(JsonClientSupport);
  /**
   * Extract the datum list from the returned data.
   *
   * @param {object} json the JSON results to extract from
   * @returns {Datum[]} the extracted data
   * @private
   */


  function datumExtractor(json) {
    if (!json || json.success !== true || json.data === undefined || Array.isArray(json.data.results) !== true) {
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
    if (!(json && json.data)) {
      return 0;
    }

    var data = json.data;
    return data.returnedResultCount + data.startingOffset < data.totalResults ? data.returnedResultCount : 0;
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
    if (!(json && json.data)) {
      return 0;
    }

    var data = json.data;

    if (page && page.max) {
      // don't bother with totalResults; just keep going unless returnedResultCount < page.max
      return data.returnedResultCount < page.max ? 0 : data.startingOffset + page.max;
    }

    return data.returnedResultCount + data.startingOffset < data.totalResults ? data.returnedResultCount + data.startingOffset : 0;
  }

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

  var MultiLoader =
  /*#__PURE__*/
  function () {
    /**
     * Constructor.
     *
     * @param {Loader[]} loaders - array of loader objects
     */
    function MultiLoader(loaders) {
      _classCallCheck(this, MultiLoader);

      Object.defineProperties(this, {
        /**
         * The class version.
         *
         * @memberof MultiLoader
         * @readonly
         * @type {string}
         */
        version: {
          value: "1.1.0"
        }
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


    _createClass(MultiLoader, [{
      key: "concurrency",
      value: function concurrency(value) {
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

    }, {
      key: "fetch",
      value: function fetch() {
        var _this = this;

        return new Promise(function (resolve, reject) {
          _this.load(function (error, results) {
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

    }, {
      key: "load",
      value: function load(callback) {
        var _this2 = this;

        // to support queue use, allow callback to be passed directly to this function
        if (typeof callback === "function") {
          this._finishedCallback = callback;
        }

        var q = d3Queue.queue(this._concurrency);

        this._loaders.forEach(function (loader) {
          // queue.defer will invoke the callback with a `null` `this` object, so `e.load.bind` here
          q.defer(loader.load.bind(loader));
        });

        q.awaitAll(function (error, results) {
          if (_this2._finishedCallback) {
            _this2._finishedCallback.call(_this2, error, results);
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

    }, {
      key: "callback",
      value: function callback(value) {
        if (!value) {
          return this._finishedCallback;
        }

        if (typeof value === "function") {
          this._finishedCallback = value;
        }

        return this;
      }
    }]);

    return MultiLoader;
  }();

  exports.DatumLoader = DatumLoader;
  exports.DatumRangeFinder = DatumRangeFinder;
  exports.DatumSourceFinder = DatumSourceFinder;
  exports.MultiLoader = MultiLoader;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=solarnetwork-datum-loader.js.map
