import anyTest, { TestFn } from "ava";
import { MockAgent, setGlobalDispatcher } from "undici";

import { Aggregations, DatumFilter } from "solarnetwork-api-core/lib/domain";
import { Logger as log, LogLevel } from "solarnetwork-api-core/lib/util";
import { SolarQueryApi } from "solarnetwork-api-core/lib/net";

import DatumLoader from "../main/datumLoader.js";
import MultiLoader from "../main/multiLoader.js";

const test = anyTest as TestFn<{
	agent: MockAgent;
	api: SolarQueryApi;
	requets: Array<any>;
}>;

log.level = LogLevel.DEBUG;

const TEST_SOURCE_ID = "test-source";
const TEST_NODE_ID = 123;
const TEST_NODE_ID_2 = 234;

const TEST_START_DATE = new Date("Sat, 1 Apr 2017 12:00:00 GMT");
const TEST_END_DATE = new Date("Mon, 1 May 2017 12:00:00 GMT");

test.beforeEach((t) => {
	const agent = new MockAgent();
	agent.disableNetConnect();
	setGlobalDispatcher(agent);
	t.context = {
		agent: agent,
		requets: [],
		api: new SolarQueryApi({ protocol: "http", host: "localhost" }),
	};
});

function testFilter() {
	const filter = new DatumFilter();
	filter.nodeId = TEST_NODE_ID;
	filter.sourceId = TEST_SOURCE_ID;
	filter.startDate = TEST_START_DATE;
	filter.endDate = TEST_END_DATE;
	filter.aggregation = Aggregations.Hour;
	return filter;
}

test("construct:public", (t) => {
	const f1 = testFilter();
	const f2 = testFilter();
	f2.nodeId = TEST_NODE_ID_2;
	const loader = new MultiLoader([
		new DatumLoader(t.context.api, f1),
		new DatumLoader(t.context.api, f2),
	]);
	t.truthy(loader);
});

test.serial("load:onePage", async (t) => {
	// GIVEN
	const http = t.context.agent.get("http://localhost");
	const expectedResults = [
		[
			{
				created: "2017-07-04 12:00:00.000Z",
				nodeId: 123,
				sourceId: "test-source",
				val: 0,
			},
		],
		[
			{
				created: "2017-07-04 12:00:00.000Z",
				nodeId: 234,
				sourceId: "test-source",
				val: 1,
			},
		],
	];
	// expect 2 page queries
	http.intercept({
		path: "/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=1000",
		method: "GET",
	}).reply(200, {
		success: true,
		data: {
			totalResults: null,
			startingOffset: 0,
			returnedResultCount: 1,
			results: expectedResults[0],
		},
	});
	http.intercept({
		path: "/solarquery/api/v1/pub/datum/list?nodeId=234&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour&withoutTotalResultsCount=true&max=1000",
		method: "GET",
	}).reply(200, {
		success: true,
		data: {
			totalResults: null,
			startingOffset: 0,
			returnedResultCount: 1,
			results: expectedResults[1],
		},
	});

	const f1 = testFilter();
	const f2 = testFilter();
	f2.nodeId = TEST_NODE_ID_2;
	const loader = new MultiLoader([
		new DatumLoader(t.context.api, f1),
		new DatumLoader(t.context.api, f2),
	]);

	const results = await loader.fetch();

	t.deepEqual(results, expectedResults);
});
