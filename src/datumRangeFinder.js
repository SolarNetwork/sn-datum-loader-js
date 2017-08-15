import { json } from 'd3-request';
import { queue } from 'd3-queue';
import {
	HttpHeaders,
	Logger as log,
	NodeDatumUrlHelper,
} from 'solarnetwork-api-core';

/**
 * @typedef {Object} DatumRange
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
 * 
 * @example
 * // the simple case, for just one SolarNode
 * const urlHelper = new NodeDatumUrlHelper();
 * urlHelper.publicQuery = true;
 * urlHelper.nodeId = 123;
 * urlHelper.sourceIds = ['a', 'b'];
 * const range = await new DatumRangeFinder(urlHelper).do();
 * 
 * @example
 * // more complex case, for multiple SolarNode / source ID combinations
 * const urlHelper2 = new NodeDatumUrlHelper();
 * urlHelper2.publicQuery = true;
 * urlHelper2.nodeId = 234;
 * urlHelper2.sourceId = 'c';
 * const range2 = await new DatumRangeFinder([urlHelper, urlHelper2]).do();
 * 
 * @example
 * // with authentication; note the authentication must be valid for all SolarNodes!
 * const auth = new AuthorizationV2Builder('my-token');
 * auth.saveSigningKey('secret');
 * urlHelper.publicQuery = false;
 * urlHelper2.publicQuery = false;
 * const range3 = await new DatumRangeFinder([urlHelper, urlHelper2], auth).do();
 */
class DatumRangeFinder {
    
    /**
     * Constructor.
     * 
     * @param {NodeDatumUrlHelper|NodeDatumUrlHelper[]} urlHelpers the helper(s) to find the avaialble data range for
	 * @param {AuthorizationV2Builder} [authBuilder] the auth builder to authenticate requests with; if not provided
	 *                                               then only public data can be queried
     */
    constructor(urlHelpers, authBuilder) {
        /** @type {NodeDatumUrlHelper[]} */
        this._helpers = Array.isArray(urlHelpers) ? urlHelpers : urlHelpers ? [urlHelpers] : [new NodeDatumUrlHelper()];

        /** @type {AuthorizationV2Builder} */
		this.authBuilder = authBuilder;
        
        /**
		 * @type {json}
		 * @private
		 */
		this.jsonClient = json;
    }

	/**
	 * Get or set a JSON client function to use. The function must be compatible with `d3.json`
	 * and defaults to that.
	 *
	 * @param {function} [value] the JSON client function, compatible with `d3.json`
	 * @returns {function|DatumRangeFinder} when used as a getter, the JSON client function, otherwise this object
	 */
	client(value) {
        if ( !value ) return this.jsonClient;
		if ( typeof value === 'function' ) {
			this.jsonClient = value;
		}
		return this;
    }
    
    /**
     * Asynchronously find the available datum range.
     * 
     * @returns {Promise<DatumRange>} the result promise
     */
    do() {
        return new Promise((resolve, reject) => {
            this.exec((error, results) => {
                if ( error ) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    }

    /**
     * Asynchronously find the available datum range using a callback.
     * 
     * @param {DatumRangeFinder~dataCallback} callback the callback function to invoke
     * @returns {void}
     */
    exec(callback) {
        const q = queue();
        const jsonClient = this.jsonClient;
        const auth = this.authBuilder;
        for ( const urlHelper of this._helpers ) {
            const url = urlHelper.reportableIntervalUrl();
            const req = jsonClient(url);
            if ( auth ) {
                req.on('beforesend', (request) => {
                    auth.reset().snDate(true).url(url);
                    request.setRequestHeader(HttpHeaders.X_SN_DATE, auth.requestDateHeaderValue);
                    request.setRequestHeader(HttpHeaders.AUTHORIZATION, auth.buildWithSavedKey());
                });
            }
            q.defer(req.get, null);
		}
        q.awaitAll((error, results) => {
            if ( error ) {
                log.error('Error requesting available data range: %s', error);
                if ( typeof callback === 'function' ) {
                    callback(error);
                }
                return;
            }
            var intervalObj = extractReportableInterval(results);
            if ( intervalObj.startDateMillis !== undefined ) {
                intervalObj.sDate = new Date(intervalObj.startDateMillis);
            }
            if ( intervalObj.endDateMillis !== undefined ) {
                intervalObj.eDate = new Date(intervalObj.endDateMillis);
            }
    
            if ( typeof callback === 'function' ) {
                callback(null, intervalObj);
            }
        });
    }

}

function extractReportableInterval(results) {
    var result,
        i = 0,
        repInterval;
    for ( i = 0; i < results.length; i += 1 ) {
        repInterval = results[i];
        if ( repInterval.data === undefined || repInterval.data.endDate === undefined ) {
            log.debug('No data available for %s sources %s',
                this._helpers[i].nodeId,
                this._helpers[i].sourceIds.join(','));
            continue;
        }
        repInterval = repInterval.data;
        if ( result === undefined ) {
            result = repInterval;
        } else {
            // merge start/end dates
            // note we don't copy the time zone... this breaks when the tz are different!
            if ( repInterval.endDateMillis > result.endDateMillis ) {
                result.endDateMillis = repInterval.endDateMillis;
                result.endDate = repInterval.endDate;
            }
            if ( repInterval.startDateMillis < result.startDateMillis ) {
                result.startDateMillis = repInterval.startDateMillis;
                result.startDate = repInterval.startDate;
            }
        }
    }
    return result;
}

export default DatumRangeFinder;
