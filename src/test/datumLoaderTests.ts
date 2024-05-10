import anyTest, { TestFn } from "ava";
import { MockAgent, setGlobalDispatcher } from "undici";

import {
	Aggregations,
	DatumFilter,
} from "solarnetwork-api-core/lib/domain/index.js";
import {
	Logger as log,
	LogLevel,
} from "solarnetwork-api-core/lib/util/index.js";
import { SolarQueryApi } from "solarnetwork-api-core/lib/net/index.js";

import DatumLoader from "../main/datumLoader.js";

const test = anyTest as TestFn<{
	agent: MockAgent;
	api: SolarQueryApi;
}>;

log.level = LogLevel.DEBUG;

const TEST_SOURCE_ID = "test-source";
const TEST_NODE_ID = 123;

const TEST_START_DATE = new Date("Sat, 1 Apr 2017 12:00:00 GMT");
const TEST_END_DATE = new Date("Mon, 1 May 2017 12:00:00 GMT");

test.beforeEach((t) => {
	const agent = new MockAgent();
	agent.disableNetConnect();
	setGlobalDispatcher(agent);
	t.context = {
		agent: agent,
		api: new SolarQueryApi({ protocol: "http", host: "localhost" }),
	};
});

function testFilter(): DatumFilter {
	const filter = new DatumFilter();
	filter.nodeId = TEST_NODE_ID;
	filter.sourceId = TEST_SOURCE_ID;
	filter.startDate = TEST_START_DATE;
	filter.endDate = TEST_END_DATE;
	filter.aggregation = Aggregations.Hour;
	return filter;
}

test.serial("load:proxy:multiPage:parallel", (t) => {
	const http = t.context.agent.get("https://query-proxy");
	const allResults = [
		{
			created: "2017-07-04 12:00:00.000Z",
			nodeId: 123,
			sourceId: "test-source",
			val: 0,
		},
		{
			created: "2017-07-04 13:00:00.000Z",
			nodeId: 123,
			sourceId: "test-source",
			val: 1,
		},
		{
			created: "2017-07-04 14:00:00.000Z",
			nodeId: 123,
			sourceId: "test-source",
			val: 0,
		},
		{
			created: "2017-07-04 15:00:00.000Z",
			nodeId: 123,
			sourceId: "test-source",
			val: 1,
		},
		{
			created: "2017-07-04 16:00:00.000Z",
			nodeId: 123,
			sourceId: "test-source",
			val: 0,
		},
		{
			created: "2017-07-04 17:00:00.000Z",
			nodeId: 123,
			sourceId: "test-source",
			val: 1,
		},
	];
	// expect 3 page queries: one for first page and total result count, 2 more for remaining pages
	http.intercept({
		path: "/path/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=false&max=2",
		method: "GET",
	}).reply(200, {
		success: true,
		data: {
			totalResults: 6,
			startingOffset: 0,
			returnedResultCount: 2,
			results: allResults.slice(0, 2),
		},
	});
	http.intercept({
		path: "/path/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=2&offset=2",
		method: "GET",
	}).reply(200, {
		success: true,
		data: {
			totalResults: null,
			startingOffset: 2,
			returnedResultCount: 2,
			results: allResults.slice(2, 4),
		},
	});
	http.intercept({
		path: "/path/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=2&offset=4",
		method: "GET",
	}).reply(200, {
		success: true,
		data: {
			totalResults: null,
			startingOffset: 4,
			returnedResultCount: 2,
			results: allResults.slice(4, 6),
		},
	});

	const filter = testFilter();
	const loader = new DatumLoader(t.context.api, filter)
		.proxyUrl("https://query-proxy/path")
		.paginationSize(2)
		.concurrency(Infinity)
		.includeTotalResultsCount(true);
	t.truthy(loader);

	return new Promise((resolve, reject) => {
		loader.load((error, results) => {
			try {
				t.falsy(error, "No error generated.");
				t.deepEqual(results, allResults, "All pages returned.");
				resolve();
			} catch (error) {
				reject(error);
			}
		});
	});
});

test.serial("load:proxy:multiPage:parallel:oneRequestReturnsNoData", (t) => {
	const http = t.context.agent.get("https://query-proxy");
	// expect 3 page queries, but 2nd fails to respond
	http.intercept({
		path: "/path/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=false&max=2",
		method: "GET",
	}).reply(200, {
		success: true,
		data: {
			totalResults: 6,
			startingOffset: 0,
			returnedResultCount: 2,
			results: [
				{
					created: "2017-07-04 12:00:00.000Z",
					nodeId: 123,
					sourceId: "test-source",
					val: 0,
				},
				{
					created: "2017-07-04 13:00:00.000Z",
					nodeId: 123,
					sourceId: "test-source",
					val: 1,
				},
			],
		},
	});
	http.intercept({
		path: "/path/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=2&offset=2",
		method: "GET",
	}).reply(200, {});
	http.intercept({
		path: "/path/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=2&offset=4",
		method: "GET",
	}).reply(200, {
		success: true,
		data: {
			totalResults: null,
			startingOffset: 4,
			returnedResultCount: 2,
			results: [
				{
					created: "2017-07-04 16:00:00.000Z",
					nodeId: 123,
					sourceId: "test-source",
					val: 0,
				},
				{
					created: "2017-07-04 17:00:00.000Z",
					nodeId: 123,
					sourceId: "test-source",
					val: 1,
				},
			],
		},
	});

	const filter = testFilter();
	const loader = new DatumLoader(t.context.api, filter)
		.proxyUrl("https://query-proxy/path")
		.paginationSize(2)
		.concurrency(Infinity)
		.includeTotalResultsCount(true);
	t.truthy(loader);

	return new Promise((resolve, reject) => {
		loader.load((error, results) => {
			try {
				t.truthy(error);
				t.is(
					error!.message,
					"Error requesting data for https://query-proxy/path/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=2&offset=2: non-success result returned"
				);
				t.truthy(results);
				resolve();
			} catch (error) {
				reject(error);
			}
		});
	});
});
