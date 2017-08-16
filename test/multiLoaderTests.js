import test from 'ava';

import sinon from 'sinon';
import {
    Aggregations,
    DatumFilter,
    Logger as log,
    logLevels,
    NodeDatumUrlHelper,
} from 'solarnetwork-api-core';
import { 
    testRequest
} from 'solarnetwork-test-utils';

import DatumLoader from '../src/datumLoader';
import MultiLoader from '../src/multiLoader';

log.level = logLevels.DEBUG;

const TEST_SOURCE_ID = 'test-source';
const TEST_NODE_ID = 123;
const TEST_NODE_ID_2 = 234;

const TEST_START_DATE = new Date('Sat, 1 Apr 2017 12:00:00 GMT');
const TEST_END_DATE = new Date('Mon, 1 May 2017 12:00:00 GMT');

test.beforeEach(t => {
    const xhr = sinon.useFakeXMLHttpRequest();
    t.context.xhr = xhr;
    const testReq = testRequest(xhr);
    t.context.reqJson = testReq.json;

    const requests = [];
    t.context.requests = requests;
    xhr.onCreate = (req) => requests.push(req);

    const urlHelper = new NodeDatumUrlHelper({
        host: 'localhost'
    });
    urlHelper.publicQuery = true;
    t.context.urlHelper = urlHelper;
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

test('construct:public', t => {
    const f1 = testFilter();
    const f2 = testFilter();
    f2.nodeId = TEST_NODE_ID_2;
    const loader = new MultiLoader([
        new DatumLoader(t.context.urlHelper, f1),
        new DatumLoader(t.context.urlHelper, f2),
    ]);
    t.truthy(loader);
});

test.serial('load:onePage', async t => {
    const f1 = testFilter();
    const f2 = testFilter();
    f2.nodeId = TEST_NODE_ID_2;
    const loader = new MultiLoader([
        new DatumLoader(t.context.urlHelper, f1).client(t.context.reqJson),
        new DatumLoader(t.context.urlHelper, f2).client(t.context.reqJson),
    ]);

    const expectedRequestResults = [
        '{"success":true,"data":' 
            +'{"totalResults": 1, "startingOffset": 0, "returnedResultCount": 1, "results": ['
                +'{"created": "2017-07-04 12:00:00.000Z","nodeId":123,"sourceId":"test-source","val":0}'
            +']}}',
        '{"success":true,"data":' 
            +'{"totalResults": 1, "startingOffset": 0, "returnedResultCount": 1, "results": ['
                +'{"created": "2017-07-04 12:00:00.000Z","nodeId":234,"sourceId":"test-source","val":1}'
            +']}}',
    ];

    const promise = loader.fetch();

    /** @type {sinon.SinonFakeXMLHttpRequest[]} */
    const reqs = t.context.requests;

    t.is(reqs.length, 2);

    for ( const datumReq of reqs ) {
        t.is(datumReq.method, 'GET');
        t.deepEqual(datumReq.requestHeaders, {
            'Accept':'application/json',
        });
        if ( datumReq.url === 'https://localhost/solarquery/api/v1/pub/datum/list?nodeId=123&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour' ) {
            datumReq.respond(200, { 'Content-Type': 'application/json' }, expectedRequestResults[0]);
        } else if ( datumReq.url === 'https://localhost/solarquery/api/v1/pub/datum/list?nodeId=234&sourceId=test-source&startDate=2017-04-01T12%3A00&endDate=2017-05-01T12%3A00&aggregation=Hour' ) {
            datumReq.respond(200, { 'Content-Type': 'application/json' }, expectedRequestResults[1]);
        } else {
            t.fail('Unexpected request: ' +JSON.stringify(datumReq, null, '  '));
        }
    }

    const results = await promise;
    t.deepEqual(results, [
        JSON.parse(expectedRequestResults[0]).data.results,
        JSON.parse(expectedRequestResults[1]).data.results,
    ]);
});
