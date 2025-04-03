import anyTest, { TestFn } from "ava";
import { MockAgent, setGlobalDispatcher } from "undici";

import { DatumFilter } from "solarnetwork-api-core/lib/domain";
import { Logger as log, LogLevel } from "solarnetwork-api-core/lib/util";
import {
	AuthorizationV2Builder,
	HttpHeaders,
	SolarQueryApi,
} from "solarnetwork-api-core/lib/net";

import DatumRangeFinder, { DatumRange } from "../main/datumRangeFinder.js";

const test = anyTest as TestFn<{
	agent: MockAgent;
	api: SolarQueryApi;
	auth: AuthorizationV2Builder;
}>;

log.level = LogLevel.DEBUG;

const TEST_SOURCE_ID = "test-source";
const TEST_SOURCE_ID_2 = "test-source-2";
const TEST_TOKEN_ID = "test-token";
const TEST_TOKEN_SECRET = "secret";
const TEST_NODE_ID = 123;
const TEST_NODE_ID_2 = 234;

test.beforeEach((t) => {
	const agent = new MockAgent();
	agent.disableNetConnect();
	setGlobalDispatcher(agent);
	const api = new SolarQueryApi({ protocol: "http", host: "localhost" });
	const auth = new AuthorizationV2Builder(TEST_TOKEN_ID, api.environment);
	auth.saveSigningKey(TEST_TOKEN_SECRET);
	t.context = {
		agent: agent,
		api: api,
		auth: auth,
	};
});

function testFilter(nodeId?: number, sourceIds?: string[]): DatumFilter {
	const filter = new DatumFilter();
	filter.nodeId = nodeId || TEST_NODE_ID;
	filter.sourceIds = sourceIds || [TEST_SOURCE_ID];
	return filter;
}

test("construct:public", (t) => {
	const finder = new DatumRangeFinder(t.context.api, testFilter());
	t.truthy(finder);
});

test.serial("do:oneHelper", async (t) => {
	// GIVEN
	const http = t.context.agent.get("http://localhost");
	const queryResult = {
		timeZone: "Pacific/Auckland",
		endDate: "2013-09-22 16:39",
		startDate: "2009-07-27 16:25",
		yearCount: 5,
		monthCount: 51,
		dayCount: 1519,
		endDateMillis: 1379824746781,
		startDateMillis: 1248668709972,
	};
	http.intercept({
		path: "/solarquery/api/v1/pub/range/interval?nodeId=123&sourceIds=test-source",
		method: "GET",
	}).reply(200, {
		success: true,
		data: queryResult,
	});

	// WHEN
	const finder = new DatumRangeFinder(t.context.api, testFilter());
	const range = await finder.fetch();

	// THEN
	const expected: DatumRange = Object.assign(
		{
			sDate: new Date(queryResult.startDateMillis),
			eDate: new Date(queryResult.endDateMillis),
			ranges: [queryResult],
		},
		queryResult
	);
	t.deepEqual(range, expected);
});

test.serial("do:oneHelper:sec", async (t) => {
	// GIVEN
	const http = t.context.agent.get("http://localhost");
	const queryResult = {
		timeZone: "Pacific/Auckland",
		endDate: "2013-09-22 16:39",
		startDate: "2009-07-27 16:25",
		yearCount: 5,
		monthCount: 51,
		dayCount: 1519,
		endDateMillis: 1379824746781,
		startDateMillis: 1248668709972,
	};
	http.intercept({
		path: "/solarquery/api/v1/sec/range/interval?nodeId=123&sourceIds=test-source",
		method: "GET",
		headers: (headers: any): boolean => {
			return t.regex(
				headers[HttpHeaders.AUTHORIZATION.toLowerCase()],
				/^SNWS2 Credential=test-token,SignedHeaders=host;x-sn-date,Signature=/
			);
		},
	}).reply(200, {
		success: true,
		data: queryResult,
	});

	// WHEN
	const finder = new DatumRangeFinder(
		t.context.api,
		testFilter(),
		t.context.auth
	);
	const range = await finder.fetch();

	// THEN
	const expected: DatumRange = Object.assign(
		{
			sDate: new Date(queryResult.startDateMillis),
			eDate: new Date(queryResult.endDateMillis),
			ranges: [queryResult],
		},
		queryResult
	);
	t.deepEqual(range, expected);
});

test.serial("do:twoHelpers", async (t) => {
	// GIVEN
	const http = t.context.agent.get("http://localhost");
	const queryResults = [
		{
			timeZone: "Pacific/Auckland",
			endDate: "2013-09-22 16:39",
			startDate: "2009-07-27 16:25",
			yearCount: 5,
			monthCount: 51,
			dayCount: 1519,
			endDateMillis: 1379824746781,
			startDateMillis: 1248668709972,
		},
		{
			timeZone: "Pacific/Auckland",
			endDate: "2017-09-22 17:00",
			startDate: "2011-07-27 16:25",
			yearCount: 5,
			monthCount: 52,
			dayCount: 1520,
			endDateMillis: 1506056400000,
			startDateMillis: 1311740700000,
		},
	];
	http.intercept({
		path: "/solarquery/api/v1/pub/range/interval?nodeId=123&sourceIds=test-source",
		method: "GET",
	}).reply(200, {
		success: true,
		data: queryResults[0],
	});
	http.intercept({
		path: "/solarquery/api/v1/pub/range/interval?nodeId=234&sourceIds=test-source,test-source-2",
		method: "GET",
	}).reply(200, {
		success: true,
		data: queryResults[1],
	});

	// WHEN
	const finder = new DatumRangeFinder(t.context.api, [
		testFilter(),
		testFilter(TEST_NODE_ID_2, [TEST_SOURCE_ID, TEST_SOURCE_ID_2]),
	]);
	const range = await finder.fetch();

	// THEN
	const expected: DatumRange = {
		startDate: queryResults[0].startDate,
		startDateMillis: queryResults[0].startDateMillis,
		sDate: new Date(queryResults[0].startDateMillis),

		endDateMillis: queryResults[1].endDateMillis,
		endDate: queryResults[1].endDate,
		eDate: new Date(queryResults[1].endDateMillis),

		timeZone: queryResults[1].timeZone,

		// these counts are not accurrate; but part of results anyway
		yearCount: queryResults[0].yearCount,
		monthCount: queryResults[0].monthCount,
		dayCount: queryResults[0].dayCount,

		ranges: queryResults,
	};
	t.deepEqual(range, expected);
});
