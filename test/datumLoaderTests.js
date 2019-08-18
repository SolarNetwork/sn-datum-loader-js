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

test("construct:public", t => {
	const loader = new DatumLoader(t.context.urlHelper, testFilter());
	t.truthy(loader);
});

test.serial.cb("load:onePage", t => {
	const filter = testFilter();
	const loader = new DatumLoader(t.context.urlHelper, filter).client(t.context.reqJson);
	t.truthy(loader);

	const expectedRequestResults = [
		'{"success":true,"data":' +
			'{"totalResults": 1, "startingOffset": 0, "returnedResultCount": 1, "results": [' +
			'{"created": "2017-07-04 12:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0}' +
			"]}}"
	];

	const expected = JSON.parse(expectedRequestResults[0]).data.results;

	loader.load(successSingleCallbackTestCompletion(t, expected));

	/** @type {sinon.SinonFakeXMLHttpRequest[]} */
	const reqs = t.context.requests;

	t.is(reqs.length, 1);

	const datumReq = reqs[0];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=1000"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[0]);
});

test.serial.cb("load:onePage:readings", t => {
	const filter = testFilter();
	const loader = new DatumLoader(t.context.urlHelper, filter)
		.client(t.context.reqJson)
		.readings(true);
	t.truthy(loader);

	const expectedRequestResults = [
		'{"success":true,"data":' +
			'{"totalResults": 1, "startingOffset": 0, "returnedResultCount": 1, "results": [' +
			'{"created": "2017-07-04 12:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0}' +
			"]}}"
	];

	const expected = JSON.parse(expectedRequestResults[0]).data.results;

	loader.load(successSingleCallbackTestCompletion(t, expected));

	/** @type {sinon.SinonFakeXMLHttpRequest[]} */
	const reqs = t.context.requests;

	t.is(reqs.length, 1);

	const datumReq = reqs[0];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/reading?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&readingType=Difference&max=1000"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[0]);
});

test.serial("load:onePage:promise", async t => {
	const filter = testFilter();
	const loader = new DatumLoader(t.context.urlHelper, filter).client(t.context.reqJson);
	t.truthy(loader);

	const expectedRequestResults = [
		'{"success":true,"data":' +
			'{"totalResults": 1, "startingOffset": 0, "returnedResultCount": 1, "results": [' +
			'{"created": "2017-07-04 12:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0}' +
			"]}}"
	];

	const promise = loader.fetch();

	/** @type {sinon.SinonFakeXMLHttpRequest[]} */
	const reqs = t.context.requests;

	t.is(reqs.length, 1);

	const datumReq = reqs[0];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=1000"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[0]);

	const results = await promise;
	const expected = JSON.parse(expectedRequestResults[0]);
	t.deepEqual(results, expected.data.results);
});

function authBuilder(environment) {
	const auth = new TestAuthBuilder(TEST_TOKEN_ID, environment);
	auth.fixedDate = TEST_DATE;
	auth.saveSigningKey(TEST_TOKEN_SECRET);
	return auth;
}

test.serial.cb("load:onePage:sec", t => {
	const urlHelper = t.context.urlHelper;
	const auth = authBuilder(urlHelper.environment);
	const filter = testFilter();
	const loader = new DatumLoader(t.context.urlHelper, filter, auth).client(t.context.reqJson);
	t.truthy(loader);

	const expectedRequestResults = [
		'{"success":true,"data":' +
			'{"totalResults": 1, "startingOffset": 0, "returnedResultCount": 1, "results": [' +
			'{"created": "2017-07-04 12:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0}' +
			"]}}"
	];

	const expected = JSON.parse(expectedRequestResults[0]).data.results;

	loader.load(successSingleCallbackTestCompletion(t, expected));

	/** @type {sinon.SinonFakeXMLHttpRequest[]} */
	const reqs = t.context.requests;

	t.is(reqs.length, 1);

	const datumReq = reqs[0];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/sec/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=1000"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json",
		"X-SN-Date": TEST_DATE_STR,
		Authorization:
			"SNWS2 Credential=test-token,SignedHeaders=host;x-sn-date,Signature=52b465e297f097b20351da727abb3e4a4695a2ac5f3745da27973ad623d5f5ac"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[0]);
});

test.serial.cb("load:incremental:onePage", t => {
	const filter = testFilter();
	const loader = new DatumLoader(t.context.urlHelper, filter)
		.client(t.context.reqJson)
		.incremental(true);
	t.truthy(loader);

	const expectedRequestResults = [
		'{"success":true,"data":' +
			'{"totalResults": 1, "startingOffset": 0, "returnedResultCount": 1, "results": [' +
			'{"created": "2017-07-04 12:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0}' +
			"]}}"
	];

	loader.load((error, results, done, page) => {
		t.is(error, undefined);
		t.is(done, true);
		t.is(page instanceof Pagination, true);
		t.is(page.offset, 0);
		const expected = JSON.parse(expectedRequestResults[0]);
		t.deepEqual(results, expected.data.results);
		t.end();
	});

	/** @type {sinon.SinonFakeXMLHttpRequest[]} */
	const reqs = t.context.requests;

	t.is(reqs.length, 1);

	const datumReq = reqs[0];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=1000"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[0]);
});

test.serial.cb("load:multiPage", t => {
	const filter = testFilter();
	const loader = new DatumLoader(t.context.urlHelper, filter)
		.client(t.context.reqJson)
		.paginationSize(2);
	t.truthy(loader);

	const expectedRequestResults = [
		'{"success":true,"data":' +
			'{"totalResults": null, "startingOffset": 0, "returnedResultCount": 2, "results": [' +
			'{"created": "2017-07-04 12:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0},' +
			'{"created": "2017-07-04 13:00:00.000Z","nodeId":123,"sourceId":"test-source","val":1}' +
			"]}}",
		'{"success":true,"data":' +
			'{"totalResults": null, "startingOffset": 2, "returnedResultCount": 2, "results": [' +
			'{"created": "2017-07-04 14:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0},' +
			'{"created": "2017-07-04 15:00:00.000Z","nodeId":123,"sourceId":"test-source","val":1}' +
			"]}}",
		'{"success":true,"data":' +
			'{"totalResults": null, "startingOffset": 4, "returnedResultCount": 0, "results": [' +
			"]}}"
	];

	const expected = JSON.parse(expectedRequestResults[0]).data.results.concat(
		JSON.parse(expectedRequestResults[1]).data.results
	);

	loader.load(successSingleCallbackTestCompletion(t, expected));

	/** @type {sinon.SinonFakeXMLHttpRequest[]} */
	const reqs = t.context.requests;

	t.is(reqs.length, 1);

	let datumReq = reqs[0];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=2"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[0]);

	t.is(reqs.length, 2);

	datumReq = reqs[1];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=2&offset=2"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[1]);

	t.is(reqs.length, 3);

	datumReq = reqs[2];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=2&offset=4"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[2]);
});

test.serial.cb("load:multiPage:readings", t => {
	const filter = testFilter();
	const loader = new DatumLoader(t.context.urlHelper, filter)
        .client(t.context.reqJson)
        .readings(true)
		.paginationSize(2);
	t.truthy(loader);

	const expectedRequestResults = [
		'{"success":true,"data":' +
			'{"totalResults": null, "startingOffset": 0, "returnedResultCount": 2, "results": [' +
			'{"created": "2017-07-04 12:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0},' +
			'{"created": "2017-07-04 13:00:00.000Z","nodeId":123,"sourceId":"test-source","val":1}' +
			"]}}",
		'{"success":true,"data":' +
			'{"totalResults": null, "startingOffset": 2, "returnedResultCount": 2, "results": [' +
			'{"created": "2017-07-04 14:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0},' +
			'{"created": "2017-07-04 15:00:00.000Z","nodeId":123,"sourceId":"test-source","val":1}' +
			"]}}",
		'{"success":true,"data":' +
			'{"totalResults": null, "startingOffset": 4, "returnedResultCount": 0, "results": [' +
			"]}}"
	];

	const expected = JSON.parse(expectedRequestResults[0]).data.results.concat(
		JSON.parse(expectedRequestResults[1]).data.results
	);

	loader.load(successSingleCallbackTestCompletion(t, expected));

	/** @type {sinon.SinonFakeXMLHttpRequest[]} */
	const reqs = t.context.requests;

	t.is(reqs.length, 1);

	let datumReq = reqs[0];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/reading?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&readingType=Difference&max=2"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[0]);

	t.is(reqs.length, 2);

	datumReq = reqs[1];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/reading?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&readingType=Difference&max=2&offset=2"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[1]);

	t.is(reqs.length, 3);

	datumReq = reqs[2];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/reading?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&readingType=Difference&max=2&offset=4"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[2]);
});

test.serial.cb("load:incremental:multiPage", t => {
	const filter = testFilter();
	const loader = new DatumLoader(t.context.urlHelper, filter)
		.client(t.context.reqJson)
		.paginationSize(2)
		.incremental(true);
	t.truthy(loader);

	const expectedRequestResults = [
		'{"success":true,"data":' +
			'{"totalResults": null, "startingOffset": 0, "returnedResultCount": 2, "results": [' +
			'{"created": "2017-07-04 12:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0},' +
			'{"created": "2017-07-04 13:00:00.000Z","nodeId":123,"sourceId":"test-source","val":1}' +
			"]}}",
		'{"success":true,"data":' +
			'{"totalResults": null, "startingOffset": 2, "returnedResultCount": 1, "results": [' +
			'{"created": "2017-07-04 14:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0}' +
			"]}}"
	];

	loader.load((error, results, done, page) => {
		t.is(error, undefined);
		t.is(page.max, 2);

		let index = page.offset / 2;
		let expected = JSON.parse(expectedRequestResults[index]).data.results;
		t.deepEqual(results, expected);
		if (done) {
			t.end();
		}
	});

	/** @type {sinon.SinonFakeXMLHttpRequest[]} */
	const reqs = t.context.requests;

	t.is(reqs.length, 1);

	let datumReq = reqs[0];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=2"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[0]);

	t.is(reqs.length, 2);

	datumReq = reqs[1];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=2&offset=2"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[1]);
});

test.serial.cb("load:multiPage:includeTotalResultsCount", t => {
	const filter = testFilter();
	const loader = new DatumLoader(t.context.urlHelper, filter)
		.client(t.context.reqJson)
		.paginationSize(2)
		.includeTotalResultsCount(true);
	t.truthy(loader);

	const expectedRequestResults = [
		'{"success":true,"data":' +
			'{"totalResults": 4, "startingOffset": 0, "returnedResultCount": 2, "results": [' +
			'{"created": "2017-07-04 12:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0},' +
			'{"created": "2017-07-04 13:00:00.000Z","nodeId":123,"sourceId":"test-source","val":1}' +
			"]}}",
		'{"success":true,"data":' +
			'{"totalResults": null, "startingOffset": 2, "returnedResultCount": 2, "results": [' +
			'{"created": "2017-07-04 14:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0},' +
			'{"created": "2017-07-04 15:00:00.000Z","nodeId":123,"sourceId":"test-source","val":1}' +
			"]}}",
		'{"success":true,"data":' +
			'{"totalResults": null, "startingOffset": 4, "returnedResultCount": 0, "results": [' +
			"]}}"
	];

	const expected = JSON.parse(expectedRequestResults[0]).data.results.concat(
		JSON.parse(expectedRequestResults[1]).data.results
	);

	loader.load(successSingleCallbackTestCompletion(t, expected));

	/** @type {sinon.SinonFakeXMLHttpRequest[]} */
	const reqs = t.context.requests;

	t.is(reqs.length, 1);

	let datumReq = reqs[0];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=false&max=2"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[0]);

	t.is(reqs.length, 2);

	datumReq = reqs[1];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=2&offset=2"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[1]);

	t.is(reqs.length, 3);

	datumReq = reqs[2];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=2&offset=4"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[2]);
});

test.serial.cb("load:multiPage:parallel", t => {
	const filter = testFilter();
	const loader = new DatumLoader(t.context.urlHelper, filter)
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
		'{"success":true,"data":' +
			'{"totalResults": null, "startingOffset": 2, "returnedResultCount": 2, "results": [' +
			'{"created": "2017-07-04 14:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0},' +
			'{"created": "2017-07-04 15:00:00.000Z","nodeId":123,"sourceId":"test-source","val":1}' +
			"]}}",
		'{"success":true,"data":' +
			'{"totalResults": null, "startingOffset": 4, "returnedResultCount": 2, "results": [' +
			'{"created": "2017-07-04 16:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0},' +
			'{"created": "2017-07-04 17:00:00.000Z","nodeId":123,"sourceId":"test-source","val":1}' +
			"]}}"
	];

	const expected = JSON.parse(expectedRequestResults[0])
		.data.results.concat(JSON.parse(expectedRequestResults[1]).data.results)
		.concat(JSON.parse(expectedRequestResults[2]).data.results);

	loader.load(successSingleCallbackTestCompletion(t, expected));

	/** @type {sinon.SinonFakeXMLHttpRequest[]} */
	const reqs = t.context.requests;

	t.is(reqs.length, 1);

	let datumReq = reqs[0];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=false&max=2"
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
		"https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=2&offset=2"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[1]);

	datumReq = reqs[2];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=2&offset=4"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[2]);
});

test.serial.cb("load:multiPage:parallel:withoutExplicitTotalResultsCount", t => {
	const filter = testFilter();
	const loader = new DatumLoader(t.context.urlHelper, filter)
		.client(t.context.reqJson)
		.paginationSize(2)
		.concurrency(Infinity);
	t.truthy(loader);

	const expectedRequestResults = [
		'{"success":true,"data":' +
			'{"totalResults": 6, "startingOffset": 0, "returnedResultCount": 2, "results": [' +
			'{"created": "2017-07-04 12:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0},' +
			'{"created": "2017-07-04 13:00:00.000Z","nodeId":123,"sourceId":"test-source","val":1}' +
			"]}}",
		'{"success":true,"data":' +
			'{"totalResults": null, "startingOffset": 2, "returnedResultCount": 2, "results": [' +
			'{"created": "2017-07-04 14:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0},' +
			'{"created": "2017-07-04 15:00:00.000Z","nodeId":123,"sourceId":"test-source","val":1}' +
			"]}}",
		'{"success":true,"data":' +
			'{"totalResults": null, "startingOffset": 4, "returnedResultCount": 2, "results": [' +
			'{"created": "2017-07-04 16:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0},' +
			'{"created": "2017-07-04 17:00:00.000Z","nodeId":123,"sourceId":"test-source","val":1}' +
			"]}}"
	];

	const expected = JSON.parse(expectedRequestResults[0])
		.data.results.concat(JSON.parse(expectedRequestResults[1]).data.results)
		.concat(JSON.parse(expectedRequestResults[2]).data.results);

	loader.load(successSingleCallbackTestCompletion(t, expected));

	/** @type {sinon.SinonFakeXMLHttpRequest[]} */
	const reqs = t.context.requests;

	t.is(reqs.length, 1);

	let datumReq = reqs[0];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=false&max=2"
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
		"https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=2&offset=2"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[1]);

	datumReq = reqs[2];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=2&offset=4"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[2]);
});

test.serial.cb("load:multiPage:parallel:outOfOrderResults", t => {
	const filter = testFilter();
	const loader = new DatumLoader(t.context.urlHelper, filter)
		.client(t.context.reqJson)
		.paginationSize(2)
		.concurrency(Infinity);
	t.truthy(loader);

	const expectedRequestResults = [
		'{"success":true,"data":' +
			'{"totalResults": 6, "startingOffset": 0, "returnedResultCount": 2, "results": [' +
			'{"created": "2017-07-04 12:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0},' +
			'{"created": "2017-07-04 13:00:00.000Z","nodeId":123,"sourceId":"test-source","val":1}' +
			"]}}",
		'{"success":true,"data":' +
			'{"totalResults": null, "startingOffset": 2, "returnedResultCount": 2, "results": [' +
			'{"created": "2017-07-04 14:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0},' +
			'{"created": "2017-07-04 15:00:00.000Z","nodeId":123,"sourceId":"test-source","val":1}' +
			"]}}",
		'{"success":true,"data":' +
			'{"totalResults": null, "startingOffset": 4, "returnedResultCount": 1, "results": [' +
			'{"created": "2017-07-04 16:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0}' +
			"]}}"
	];

	const expected = JSON.parse(expectedRequestResults[0])
		.data.results.concat(JSON.parse(expectedRequestResults[1]).data.results)
		.concat(JSON.parse(expectedRequestResults[2]).data.results);

	loader.load(successSingleCallbackTestCompletion(t, expected));

	/** @type {sinon.SinonFakeXMLHttpRequest[]} */
	const reqs = t.context.requests;

	t.is(reqs.length, 1);

	let datumReq = reqs[0];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=false&max=2"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[0]);

	t.is(reqs.length, 3); // note jump to three for parallel

	// note out of order requests, the last request is being returned first
	datumReq = reqs[2];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=2&offset=4"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[2]);

	datumReq = reqs[1];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=2&offset=2"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[1]);
});

test.serial.cb("load:onePage:parallel", t => {
	const filter = testFilter();
	const loader = new DatumLoader(t.context.urlHelper, filter)
		.client(t.context.reqJson)
		.paginationSize(1000)
		.concurrency(Infinity);
	t.truthy(loader);

	const expectedRequestResults = [
		'{"success":true,"data":' +
			'{"totalResults": 2, "startingOffset": 0, "returnedResultCount": 2, "results": [' +
			'{"created": "2017-07-04 12:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0},' +
			'{"created": "2017-07-04 13:00:00.000Z","nodeId":123,"sourceId":"test-source","val":1}' +
			"]}}"
	];

	const expected = JSON.parse(expectedRequestResults[0]).data.results;

	loader.load(successSingleCallbackTestCompletion(t, expected));

	/** @type {sinon.SinonFakeXMLHttpRequest[]} */
	const reqs = t.context.requests;

	t.is(reqs.length, 1);

	let datumReq = reqs[0];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=false&max=1000"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[0]);

	t.is(reqs.length, 1); // no more requests
});

test.serial.cb("load:onePage:proxy", t => {
	const filter = testFilter();
	const loader = new DatumLoader(t.context.urlHelper, filter).client(t.context.reqJson);
	loader.proxyUrl('https://query-proxy/path');
	t.truthy(loader);

	const expectedRequestResults = [
		'{"success":true,"data":' +
			'{"totalResults": 1, "startingOffset": 0, "returnedResultCount": 1, "results": [' +
			'{"created": "2017-07-04 12:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0}' +
			"]}}"
	];

	const expected = JSON.parse(expectedRequestResults[0]).data.results;

	loader.load(successSingleCallbackTestCompletion(t, expected));

	/** @type {sinon.SinonFakeXMLHttpRequest[]} */
	const reqs = t.context.requests;

	t.is(reqs.length, 1);

	const datumReq = reqs[0];
	t.is(datumReq.method, "GET");
	t.is(
		datumReq.url,
		"https://query-proxy/path/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=1000"
	);
	t.deepEqual(datumReq.requestHeaders, {
		Accept: "application/json"
	});
	datumReq.respond(200, { "Content-Type": "application/json" }, expectedRequestResults[0]);
});
