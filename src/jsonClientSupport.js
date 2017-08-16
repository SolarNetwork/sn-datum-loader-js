import { json } from 'd3-request';

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
class JsonClientSupport {

    /**
	 * Constructor.
	 * 
	 * @param {AuthorizationV2Builder} [authBuilder] the auth builder to authenticate requests with; if not provided
	 *                                               then only public data can be queried
	 */
    constructor(authBuilder) {

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
        this.jsonClient = json;
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
	client(value) {
        if ( !value ) return this.jsonClient;
		if ( typeof value === 'function' ) {
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
    fetch() {
        return new Promise((resolve, reject) => {
            this.load((error, results) => {
                if ( error ) {
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
    load(callback) {
        callback(new Error('Abstract method must be implemented by subclass.'));
    }
}

export default JsonClientSupport;
