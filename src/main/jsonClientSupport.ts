import { Net, Util } from "solarnetwork-api-core";

import { LoaderDataCallbackFn } from "./loader.js";

interface ApiResult {
	success: boolean;
	message?: string;
	data?: any;
}

/**
 * An abstract class for JSON client support.
 */
abstract class JsonClientSupport<T> {
	/**
	 * The API instance to use.
	 */
	protected readonly api: Net.SolarQueryApi;

	/**
	 * An authorization builder to use to make authenticated HTTP requests.
	 */
	protected readonly authBuilder?: Net.AuthorizationV2Builder;

	/**
	 * Constructor.
	 *
	 * @param authBuilder the auth builder to authenticate requests with; if not provided
	 *                    then only public data can be queried
	 */
	constructor(
		api: Net.SolarQueryApi,
		authBuilder?: Net.AuthorizationV2Builder
	) {
		this.api = api;
		this.authBuilder = authBuilder;
		if (!authBuilder) {
			api.publicQuery = true;
		}
	}

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
	protected requestor<V>(
		url: string,
		signUrl?: string
	): (cb: LoaderDataCallbackFn<V>) => void {
		const auth = this.authBuilder;
		return (cb: LoaderDataCallbackFn<V>) => {
			const headers: any = {
				Accept: "application/json",
			};
			if (auth && auth.signingKeyValid) {
				headers[Net.HttpHeaders.AUTHORIZATION] = auth
					.reset()
					.snDate(true)
					.url(signUrl || url, true)
					.buildWithSavedKey();
				headers[Net.HttpHeaders.X_SN_DATE] =
					auth.requestDateHeaderValue;
			}

			const errorHandler = (error: any) => {
				Util.Logger.error(
					"Error requesting data for %s: %s",
					url,
					error
				);
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
					const r = json as ApiResult;
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
