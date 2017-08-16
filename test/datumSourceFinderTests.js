import test from 'ava';

import sinon from 'sinon';
import {
    DatumFilter,
    Logger as log,
    logLevels,
    NodeDatumUrlHelper,
} from 'solarnetwork-api-core';
import { 
    TestAuthorizationV2Builder as TestAuthBuilder,
    testRequest
} from 'solarnetwork-test-utils';

import DatumSourceFinder from '../src/datumSourceFinder';

log.level = logLevels.DEBUG;

const TEST_TOKEN_ID = 'test-token';
const TEST_TOKEN_SECRET = 'secret';
const TEST_NODE_ID = 123;
const TEST_NODE_ID_2 = 234;

const TEST_DATE_STR = 'Tue, 25 Apr 2017 14:30:00 GMT';
const TEST_DATE = new Date(TEST_DATE_STR);

test.beforeEach(t => {
    const xhr = sinon.useFakeXMLHttpRequest();
    t.context.xhr = xhr;
    const testReq = testRequest(xhr);
    t.context.reqJson = testReq.json;

    const requests = [];
    t.context.requests = requests;
    xhr.onCreate = (req) => requests.push(req);
});

function testUrlHelper() {
    const urlHelper = new NodeDatumUrlHelper({
        host: 'localhost'
    });
    urlHelper.publicQuery = true;
    urlHelper.nodeId = TEST_NODE_ID;
    return urlHelper;
}

function testAuthBuilder(environment) {
    const auth = new TestAuthBuilder(TEST_TOKEN_ID, environment);
    auth.fixedDate = TEST_DATE;
    auth.saveSigningKey(TEST_TOKEN_SECRET);
    return auth;
}

test('construct:public', t => {
    const finder = new DatumSourceFinder(testUrlHelper());
    t.truthy(finder);
});

test.serial('fetch:oneNode', async t => {
    const finder = new DatumSourceFinder(testUrlHelper()).client(t.context.reqJson);

    const expectedResult = ["a", "b", "c"];

    const sourcesPromise = finder.fetch();

    /** @type {sinon.SinonFakeXMLHttpRequest[]} */
    const reqs = t.context.requests;

    t.is(reqs.length, 1);

    const datumReq = reqs[0];
    t.is(datumReq.method, 'GET');
    t.is(datumReq.url, 'https://localhost/solarquery/api/v1/pub/range/sources?nodeId=123');
    t.deepEqual(datumReq.requestHeaders, {
        'Accept':'application/json',
    });
    datumReq.respond(200, { 'Content-Type': 'application/json' }, '{"success":true,"data":' 
        +JSON.stringify(expectedResult)
        +'}');

    const sources = await sourcesPromise;
    t.deepEqual(sources, {123:expectedResult});
});

test.serial('fetch:oneNode:filter', async t => {
    const filter = new DatumFilter();
    filter.startDate = new Date('2017-01-01T12:00:00.000Z');
    filter.metadataFilter = '(t=foo)';
    const finder = new DatumSourceFinder(testUrlHelper())
        .filter(filter)
        .client(t.context.reqJson);

    const expectedResult = ["a", "b", "c"];

    const sourcesPromise = finder.fetch();

    /** @type {sinon.SinonFakeXMLHttpRequest[]} */
    const reqs = t.context.requests;

    t.is(reqs.length, 1);

    const datumReq = reqs[0];
    t.is(datumReq.method, 'GET');
    t.is(datumReq.url, 'https://localhost/solarquery/api/v1/pub/range/sources?startDate=2017-01-01T12%3A00&metadataFilter=(t%3Dfoo)&nodeId=123');
    t.deepEqual(datumReq.requestHeaders, {
        'Accept':'application/json',
    });
    datumReq.respond(200, { 'Content-Type': 'application/json' }, '{"success":true,"data":' 
        +JSON.stringify(expectedResult)
        +'}');

    const sources = await sourcesPromise;
    t.deepEqual(sources, {123:expectedResult});
});

test.serial('oneNode:sec', async t => {
    const urlHelper = testUrlHelper();
    urlHelper.publicQuery = false;
    const auth = testAuthBuilder(urlHelper.environment);
    const finder = new DatumSourceFinder(urlHelper, auth).client(t.context.reqJson);

    const expectedResult = ["a", "b", "c"];
    
    const sourcesPromise = finder.fetch();
    
    /** @type {sinon.SinonFakeXMLHttpRequest[]} */
    const reqs = t.context.requests;

    t.is(reqs.length, 1);

    const datumReq = reqs[0];
    t.is(datumReq.method, 'GET');
    t.is(datumReq.url, 'https://localhost/solarquery/api/v1/sec/range/sources?nodeId=123');
    t.deepEqual(datumReq.requestHeaders, {
        'Accept':'application/json',
        'Authorization': 'SNWS2 Credential=test-token,SignedHeaders=host;x-sn-date,Signature=6ba24f2104727431aaf1b9bf160e1e95b3f5cd21d65a3d026e4974d9c6f75704',
        'X-SN-Date': TEST_DATE_STR,
    });
    datumReq.respond(200, { 'Content-Type': 'application/json' }, '{"success":true,"data":' 
        +JSON.stringify(expectedResult)
        +'}');

        const sources = await sourcesPromise;
        t.deepEqual(sources, {123:expectedResult});
});

test.serial('fetch:multiNode', async t => {
    const urlHelper = testUrlHelper();
    urlHelper.nodeIds = [TEST_NODE_ID, TEST_NODE_ID_2];
    const finder = new DatumSourceFinder(urlHelper).client(t.context.reqJson);

    const expectedResults = [
        ["a", "b", "c"],
        ["b", "d", "e"],
    ];

    const sourcesPromise = finder.fetch();

    /** @type {sinon.SinonFakeXMLHttpRequest[]} */
    const reqs = t.context.requests;

    t.is(reqs.length, expectedResults.length);

    for ( let i = 0, len = expectedResults.length; i < len; i += 1 ) {
        const datumReq = reqs[i];
        t.is(datumReq.method, 'GET');
        t.deepEqual(datumReq.requestHeaders, {
            'Accept':'application/json',
        });
        const nodeId = (i === 0 ? TEST_NODE_ID : TEST_NODE_ID_2);
        t.is(datumReq.url, 'https://localhost/solarquery/api/v1/pub/range/sources?nodeId=' +nodeId);
        datumReq.respond(200, { 'Content-Type': 'application/json' }, '{"success":true,"data":' 
            +JSON.stringify(expectedResults[i])
            +'}');

    }

    const sources = await sourcesPromise;
    t.deepEqual(sources, {
        123:expectedResults[0], 
        234:expectedResults[1]
    });
});
