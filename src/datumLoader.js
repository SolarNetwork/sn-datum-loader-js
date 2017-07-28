import { json } from 'd3-request';

class DatumLoader {

    constructor() {

        /** @type {json} */
        this.jsonClient = json;

        /** @type {function} */
        this.finishedCallback = undefined;

        /** @type {object} */
        this.urlParameters = undefined;
    }

	/**
	 * Get or set a JSON client function to use. The function must be compatible with `d3.json`
	 * and defaults to that.
	 *
	 * @param {function} [value] the JSON client function, compatible with `d3.json`
	 * @returns {function|DatumLoader} when used as a getter, the JSON client function, otherwise this object
	 */
	jsonClient(value) {
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
    urlParameters(value) {
		if ( !value ) return this.urlParameters;
		if ( typeof value === 'object' ) {
			this.urlParameters = value;
		}
		return this;
	}

}

export default DatumLoader;
