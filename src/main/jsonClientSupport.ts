import { AuthorizationV2Builder } from "solarnetwork-api-core/lib/net";
import { SolarQueryApi } from "solarnetwork-api-core/lib/net";

/**
 * An abstract class with customizable JSON client support.
 */
abstract class JsonClientSupport<T> {
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
	constructor(api: SolarQueryApi, authBuilder?: AuthorizationV2Builder) {
		this.api = api;
		this.authBuilder = authBuilder;
	}

	/**
	 * Asynchronously load the data.
	 *
	 * This method calls {@link JsonClientSupport.load} to perform the actual work.
	 *
	 * @returns the result promise
	 */
	abstract fetch(): Promise<T>;
}

export default JsonClientSupport;
