import test from "ava";

import sinon from "sinon";
import {
	Aggregations,
	DatumFilter,
	Logger as log,
	logLevels,
	NodeDatumUrlHelper,
	Pagination
} from "solarnetwork-api-core";
import {
	TestAuthorizationV2Builder as TestAuthBuilder,
	testRequest
} from "solarnetwork-test-utils";

import DatumLoader from "../src/datumLoader";

log.level = logLevels.DEBUG;

const TEST_SOURCE_ID = "test-source";
const TEST_TOKEN_ID = "test-token";
const TEST_TOKEN_SECRET = "secret";
const TEST_NODE_ID = 123;

const TEST_DATE_STR = "Tue, 25 Apr 2017 14:30:00 GMT";
const TEST_DATE = new Date(TEST_DATE_STR);

const TEST_START_DATE = new Date("Sat, 1 Apr 2017 12:00:00 GMT");
const TEST_END_DATE = new Date("Mon, 1 May 2017 12:00:00 GMT");

test.beforeEach(t => {
	const xhr = sinon.useFakeXMLHttpRequest();
	t.context.xhr = xhr;
	const testReq = testRequest(xhr);
	t.context.reqJson = testReq.json;

	const requests = [];
	t.context.requests = requests;
	xhr.onCreate = req => requests.push(req);

	const urlHelper = new NodeDatumUrlHelper({
		host: "localhost"
	});
	t.context.urlHelper = urlHelper;
});

function successSingleCallbackTestCompletion(t, expected) {
	var callbackCount = 0;

	return function handleResults(error, results) {
		t.is(++callbackCount, 1, "Callback called only once");
		t.is(error, undefined);
		t.deepEqual(results, expected);
		t.end();
	};
}

function testFilter() {
	const filter = new DatumFilter();
	filter.nodeId = TEST_NODE_ID;
	filter.sourceId = TEST_SOURCE_ID;
	filter.startDate = TEST_START_DATE;
	filter.endDate = TEST_END_DATE;
	filter.aggregation = Aggregations.Hour;
	return filter;
}

test.serial.cb("load:proxy:multiPage:parallel:oneRequestHasError", t => {
	const filter = testFilter();
	const loader = new DatumLoader(t.context.urlHelper, filter)
		.proxyUrl("https://query-proxy/path")
		.client(t.context.reqJson)
		.paginationSize(2)
		.concurrency(Infinity)
		.includeTotalResultsCount(true);
	t.truthy(loader);

	const expectedRequestResults = [
		'{"success":true,"data":' +
			'{"totalResults": 6, "startingOffset": 0, "returnedResultCount": 2, "results": [' +
			'{"created": "2017-07-04 12:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0},' +
			'{"created": "2017-07-04 13:00:00.000Z","nodeId":123,"sourceId":"test-source","val":1}' +
			"]}}",
		undefined,
		'{"success":true,"data":' +
			'{"totalResults": null, "startingOffset": 4, "returnedResultCount": 2, "results": [' +
			'{"created": "2017-07-04 16:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0},' +
			'{"created": "2017-07-04 17:00:00.000Z","nodeId":123,"sourceId":"test-source","val":1}' +
			"]}}"
	];

	loader.load(function handleResults(error, results) {
		t.truthy(error);
		t.is(
			error.message,
			"One or more requests did not return a result, but no error was reported."
		);
		t.truthy(results);
		t.end();
	});

	/** @type {sinon.SinonFakeXMLHttpRequest[]} */
	const reqs = t.context.requests;

	t.is(reqs.length, 1);

	let datumReq = reqs[0];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://query-proxy/path/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=false&max=2"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[0]);

	t.is(reqs.length, 3); // note jump to three for parallel

	datumReq = reqs[1];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://query-proxy/path/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=2&offset=2"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, undefined);

	datumReq = reqs[2];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://query-proxy/path/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=2&offset=4"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[2]);
});
