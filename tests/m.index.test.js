require('env-yaml').config();

const { getFunction } = require('@google-cloud/functions-framework/testing');

describe('getQRCodes', () => {

  const assert = require('assert');
  const sinon = require('sinon');
  const { skus, getIdToken } = require('./functions')
  const { request } = require('gaxios');

  require('..');
  const getQRCodes = getFunction('getQRCodes');
  const count = 10;
  const skus_ = skus(count)

  // local test
  it('local test', async () => {
    // Mock ExpressJS 'req' and 'res' parameters
    const req = {
      query: {},
      body: skus_,
    };
    const res = {
      send: sinon.stub(),
      status : function(code){ return this }
    };

    // Call tested function
    await getQRCodes(req, res);

    // Verify behavior of tested function
    assert.ok(res.send.calledOnce);
    assert.equal(res.send.firstCall.args[0].qrcodes.length, count);
  });

  // deployed version test
  it('deployed version test', async () => {
    try{
      const token = await getIdToken()
      const response = await request({
        url: "https://europe-west3-mtc-platform.cloudfunctions.net/getQRCodes",
        method: 'POST',
        data: skus_,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type" : 'application/json'
        }
      });
      assert.equal(response.data.qrcodes.length, count);
    } catch (e) {
      console.log(e.message)
      assert.fail("server error")
    }

  });
})