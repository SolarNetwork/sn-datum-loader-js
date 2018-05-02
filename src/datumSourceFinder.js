import { queue } from 'd3-queue';
import {
    DatumFilter,
	HttpHeaders,
	Logger as log,
	NodeDatumUrlHelper,
} from 'solarnetwork-api-core';

import JsonClientSupport from './jsonClientSupport';

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
 * 
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
class DatumSourceFinder extends JsonClientSupport {
    
    /**
     * Constructor.
     * 
     * @param {NodeDatumUrlHelper|NodeDatumUrlHelper[]} urlHelpers the helper(s) to find the avaialble sources for
	 * @param {AuthorizationV2Builder} [authBuilder] the auth builder to authenticate requests with; if not provided
	 *                                               then only public data can be queried; when provided a pre-signed
     *                                               key must be available
     */
    constructor(urlHelpers, authBuilder) {
        super(authBuilder);
        Object.defineProperties(this, {
            /**
             * The class version.
             * 
             * @memberof DatumSourceFinder
             * @readonly
             * @type {string}
             */
            version: { value: '1.0.0' }
        });

        /**
         * @type {NodeDatumUrlHelper[]}
         * @private
         */
        this._helpers = Array.isArray(urlHelpers) ? urlHelpers : urlHelpers ? [urlHelpers] : [new NodeDatumUrlHelper()];
    }

	/**
	 * Get or set a `DatumFilter` to limit the query with.
     * 
     * The `startDate`, `endDate`, and `metadataFilter` properties can be used to limit the query scope.
	 *
	 * @param {DatumFilter} [value] the datum filter to use
	 * @returns {function|DatumFilter} when used as a getter, the filter, otherwise this object
	 */
	filter(value) {
        if ( !value ) return this.datumFilter;
		if ( value instanceof DatumFilter ) {
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
    load(callback) {
        const q = queue();
        const jsonClient = this.client();
        const auth = this.authBuilder;
        const requestKeys = [];

        function addRequest(key, url) {
            requestKeys.push(key);
            const req = jsonClient(url)
                .on('beforesend', (request) => {
                    if ( auth && auth.signingKeyValid ) {
                        auth.reset().snDate(true).url(url);
                        request.setRequestHeader(HttpHeaders.X_SN_DATE, auth.requestDateHeaderValue);
                        request.setRequestHeader(HttpHeaders.AUTHORIZATION, auth.buildWithSavedKey());
                    }
                });
            q.defer(req.get, null);
        }
        for ( const urlHelper of this._helpers ) {
            const filter = new DatumFilter(this.datumFilter);
            filter.nodeIds = urlHelper.nodeIds;
            if ( filter.metadataFilter || filter.nodeIds.length === 1 ) {
                // when metadata filter used, multiple node IDs allowed
                addRequest(this.metadataFilter ? null : filter.nodeId, urlHelper.availableSourcesUrl(filter));
            } else {
                // no metadata filter, or multiple node IDs, so add one node ID at a time
                for ( const nodeId of filter.nodeIds ) {
                    const oneFilter = new DatumFilter(filter);
                    oneFilter.nodeId = nodeId;
                    addRequest(nodeId, urlHelper.availableSourcesUrl(oneFilter));
                }
            }
        }
        
        q.awaitAll((error, results) => {
            if ( error ) {
                log.error('Error requesting available sources: %s', error);
                if ( typeof callback === 'function' ) {
                    callback(error);
                }
                return;
            }

            const result = {};

            for ( let i = 0, len = results.length; i < len; i += 1 ) {
                const data = (Array.isArray(results[i].data) ? results[i].data : undefined);
                if ( !data ) {
                    continue;
                }
                const key = requestKeys[i];
                if ( key === null ) {
                    // result is array of nodeId/soruceId pairs, e.g. {nodeId:1, sourceId:"foo"}
                    for ( const pair of data ) {
                        let nodeIds = result[pair.nodeId];
                        if ( !nodeIds ) {
                            nodeIds = [];
                            result[pair.nodeId] = nodeIds;
                        }
                        if ( nodeIds.indexOf(pair.sourceId) < 0 ) {
                            nodeIds.push(pair.sourceId);
                        }
                    }
                } else {
                    // result is array of sourceIds
                    let nodeIds = result[key];
                    if ( !nodeIds ) {
                        result[key] = data;
                    } else {
                        for ( const sourceId of data ) {
                            if ( nodeIds.indexOf(sourceId) < 0 ) {
                                nodeIds.push(sourceId);
                            }
                        }
                    }
                }
            }
    
            if ( typeof callback === 'function' ) {
                callback(null, result);
            }
        });
    }

}

export default DatumSourceFinder;
