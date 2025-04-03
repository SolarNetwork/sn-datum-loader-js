import { HttpHeaders, } from "solarnetwork-api-core/lib/net";
import { Logger as log } from "solarnetwork-api-core/lib/util";
/**
 * An abstract class for JSON client support.
 */
class JsonClientSupport {
    /**
     * The API instance to use.
     */
    api;
    /**
     * An authorization builder to use to make authenticated HTTP requests.
     */
    authBuilder;
    /**
     * Constructor.
     *
     * @param authBuilder the auth builder to authenticate requests with; if not provided
     *                    then only public data can be queried
     */
    constructor(api, authBuilder) {
        this.api = api;
        this.authBuilder = authBuilder;
        if (!authBuilder) {
            api.publicQuery = true;
        }
    }
    /**
     * Create a URL fetch requestor.
     *
     * The returned function can be passed to `d3.queue` or invoked directly.
     *
     * @param url the URL to request.
     * @param signUrl the URL to sign (might be different to `url` if a proxy is used)
     * @returns a function that accepts a callback argument
     */
    requestor(url, signUrl) {
        const auth = this.authBuilder;
        return (cb) => {
            const headers = {
                Accept: "application/json",
            };
            if (auth && auth.signingKeyValid) {
                headers[HttpHeaders.AUTHORIZATION] = auth
                    .reset()
                    .snDate(true)
                    .url(signUrl || url, true)
                    .buildWithSavedKey();
                headers[HttpHeaders.X_SN_DATE] = auth.requestDateHeaderValue;
            }
            const errorHandler = (error) => {
                log.error("Error requesting data for %s: %s", url, error);
                cb(new Error(`Error requesting data for ${url}: ${error}`));
            };
            fetch(url, {
                headers: headers,
            }).then((res) => {
                if (!res.ok) {
                    errorHandler(res.statusText);
                    return;
                }
                res.json().then((json) => {
                    const r = json;
                    if (!r.success) {
                        let msg = "non-success result returned";
                        if (r.message) {
                            msg += " (" + r.message + ")";
                        }
                        errorHandler(msg);
                        return;
                    }
                    cb(undefined, r.data);
                }, errorHandler);
            }, errorHandler);
        };
    }
}
export default JsonClientSupport;
//# sourceMappingURL=jsonClientSupport.js.map