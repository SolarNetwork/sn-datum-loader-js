import { AuthorizationV2Builder } from "solarnetwork-api-core/lib/net/index.js";
import { SolarQueryApi } from "solarnetwork-api-core/lib/net/index.js";
import { LoaderDataCallbackFn } from "./loader.js";
/**
 * An abstract class for JSON client support.
 */
declare abstract class JsonClientSupport<T> {
    /**
     * The API instance to use.
     */
    protected readonly api: SolarQueryApi;
    /**
     * An authorization builder to use to make authenticated HTTP requests.
     */
    protected readonly authBuilder?: AuthorizationV2Builder;
    /**
     * Constructor.
     *
     * @param authBuilder the auth builder to authenticate requests with; if not provided
     *                    then only public data can be queried
     */
    constructor(api: SolarQueryApi, authBuilder?: AuthorizationV2Builder);
    /**
     * Asynchronously load the data.
     *
     * @returns the result promise
     */
    abstract fetch(): Promise<T>;
    /**
     * Create a URL fetch requestor.
     *
     * The returned function can be passed to `d3.queue` or invoked directly.
     *
     * @param url the URL to request.
     * @param signUrl the URL to sign (might be different to `url` if a proxy is used)
     * @returns a function that accepts a callback argument
     */
    protected requestor<V>(url: string, signUrl?: string): (cb: LoaderDataCallbackFn<V>) => void;
}
export default JsonClientSupport;
//# sourceMappingURL=jsonClientSupport.d.ts.map