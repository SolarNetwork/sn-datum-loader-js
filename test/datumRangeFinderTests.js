import test from 'ava';

import sinon from 'sinon';
import {
    Logger as log,
    logLevels,
    NodeDatumUrlHelper,
} from 'solarnetwork-api-core';
import { 
    TestAuthorizationV2Builder as TestAuthBuilder,
    testRequest
} from 'solarnetwork-test-utils';

import DatumRangeFinder from '../src/datumRangeFinder';

log.level = logLevels.DEBUG;

const TEST_SOURCE_ID = 'test-source';
const TEST_SOURCE_ID_2 = 'test-source-2';
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
    urlHelper.sourceId = TEST_SOURCE_ID;
    return urlHelper;
}

function testAuthBuilder(environment) {
    const auth = new TestAuthBuilder(TEST_TOKEN_ID, environment);
    auth.fixedDate = TEST_DATE;
    auth.saveSigningKey(TEST_TOKEN_SECRET);
    return auth;
}

test('construct:public', t => {
    const finder = new DatumRangeFinder([testUrlHelper()]);
    t.truthy(finder);
});

test.serial('do:oneHelper', async t => {
    const finder = new DatumRangeFinder([testUrlHelper()]).client(t.context.reqJson);

    const expectedResult = {
        "timeZone": "Pacific/Auckland",
        "endDate": "2013-09-22 16:39",
        "startDate": "2009-07-27 16:25",
        "yearCount": 5,
        "monthCount": 51,
        "dayCount": 1519,
        "endDateMillis": 1379824746781,
        "startDateMillis": 1248668709972
    };

    const rangePromise = finder.do();

    /** @type {sinon.SinonFakeXMLHttpRequest[]} */
    const reqs = t.context.requests;

    t.is(reqs.length, 1);

    const datumReq = reqs[0];
    t.is(datumReq.method, 'GET');
    t.is(datumReq.url, 'https://localhost/solarquery/api/v1/pub/range/interval?nodeId=123&sourceIds=test-source');
    t.deepEqual(datumReq.requestHeaders, {
        'Accept':'application/json',
    });
    datumReq.respond(200, { 'Content-Type': 'application/json' }, '{"success":true,"data":' 
        +JSON.stringify(expectedResult)
        +'}');

    const range = await rangePromise;
    t.deepEqual(range, {
        startDateMillis: 1248668709972,
        endDateMillis: 1379824746781,
        sDate: new Date(1248668709972),
        eDate: new Date(1379824746781),

        // all other props copied from first
        "timeZone": "Pacific/Auckland",
        "endDate": "2013-09-22 16:39",
        "startDate": "2009-07-27 16:25",
        "yearCount": 5,
        "monthCount": 51,
        "dayCount": 1519,
    });
});

test.serial('do:oneHelper:sec', async t => {
    const urlHelper = testUrlHelper();
    urlHelper.publicQuery = false;
    const auth = testAuthBuilder(urlHelper.environment);
    const finder = new DatumRangeFinder([urlHelper], auth).client(t.context.reqJson);

    const expectedResult = {
        "timeZone": "Pacific/Auckland",
        "endDate": "2013-09-22 16:39",
        "startDate": "2009-07-27 16:25",
        "yearCount": 5,
        "monthCount": 51,
        "dayCount": 1519,
        "endDateMillis": 1379824746781,
        "startDateMillis": 1248668709972
    };

    const rangePromise = finder.do();

    /** @type {sinon.SinonFakeXMLHttpRequest[]} */
    const reqs = t.context.requests;

    t.is(reqs.length, 1);

    const datumReq = reqs[0];
    t.is(datumReq.method, 'GET');
    t.is(datumReq.url, 'https://localhost/solarquery/api/v1/sec/range/interval?nodeId=123&sourceIds=test-source');
    t.deepEqual(datumReq.requestHeaders, {
        'Accept':'application/json',
        'Authorization': 'SNWS2 Credential=test-token,SignedHeaders=host;x-sn-date,Signature=9b03f9f640c424df2aa4e4f986f779f6080a6cb57acfc528403ad5ef6856fc10',
        'X-SN-Date': TEST_DATE_STR,
    });
    datumReq.respond(200, { 'Content-Type': 'application/json' }, '{"success":true,"data":' 
        +JSON.stringify(expectedResult)
        +'}');

    const range = await rangePromise;
    t.deepEqual(range, {
        startDateMillis: 1248668709972,
        endDateMillis: 1379824746781,
        sDate: new Date(1248668709972),
        eDate: new Date(1379824746781),

        // all other props copied from first
        "timeZone": "Pacific/Auckland",
        "endDate": "2013-09-22 16:39",
        "startDate": "2009-07-27 16:25",
        "yearCount": 5,
        "monthCount": 51,
        "dayCount": 1519,
    });
});

test.serial('do:twoHelpers', async t => {
    const urlHelper1 = testUrlHelper();
    const urlHelper2 = testUrlHelper();
    urlHelper2.nodeId = TEST_NODE_ID_2;
    urlHelper2.sourceIds = [TEST_SOURCE_ID, TEST_SOURCE_ID_2];
    const finder = new DatumRangeFinder([urlHelper1, urlHelper2]).client(t.context.reqJson);

    const expectedResults = [{
        "timeZone": "Pacific/Auckland",
        "endDate": "2013-09-22 16:39",
        "startDate": "2009-07-27 16:25",
        "yearCount": 5,
        "monthCount": 51,
        "dayCount": 1519,
        "endDateMillis": 1379824746781,
        "startDateMillis": 1248668709972
    },{
        "timeZone": "Pacific/Auckland",
        "endDate": "2017-09-22 17:00",
        "startDate": "2011-07-27 16:25",
        "yearCount": 5,
        "monthCount": 52,
        "dayCount": 1520,
        "endDateMillis": 1506056400000,
        "startDateMillis": 1311740700000
    }];


    const rangePromise = finder.do();

    /** @type {sinon.SinonFakeXMLHttpRequest[]} */
    const reqs = t.context.requests;

    t.is(reqs.length, 2);
    for ( let i = 0; i < 2; i += 1 ) {
        const datumReq = reqs[i];
        t.is(datumReq.method, 'GET');
        t.deepEqual(datumReq.requestHeaders, {
            'Accept':'application/json',
        });
        if ( i === 0 ) {
            t.is(datumReq.url, 'https://localhost/solarquery/api/v1/pub/range/interval?nodeId=123&sourceIds=test-source');
        } else {
            t.is(datumReq.url, 'https://localhost/solarquery/api/v1/pub/range/interval?nodeId=234&sourceIds=test-source,test-source-2');
        }
        datumReq.respond(200, { 'Content-Type': 'application/json' }, '{"success":true,"data":' 
            +JSON.stringify(expectedResults[i])
            +'}');
        }


    const range = await rangePromise;
    t.deepEqual(range, {
        startDateMillis: 1248668709972,
        endDateMillis: 1506056400000,
        sDate: new Date(1248668709972),
        eDate: new Date(1506056400000),

        // all other props copied from first
        "timeZone": "Pacific/Auckland",
        "endDate": "2017-09-22 17:00",
        "startDate": "2009-07-27 16:25",
        "yearCount": 5,
        "monthCount": 51,
        "dayCount": 1519,
    });
});
