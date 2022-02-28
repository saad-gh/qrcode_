require('env-yaml').config();

const request = require("supertest");
const app = require("..").service;
const { timeout } = require("../qrcode")
const { skus } = require("./functions")

let skuqty, body;

describe("performance", () => {
  skuqty = 50
  body = skus(skuqty)
  test(`upload time: ${skuqty} skus`, async () => {
    const response = await request(app)
      .post("/getQRCodes")
      .send(body)

    console.log(response.body.data)
    expect(response.statusCode).toBe(201) 
  });
})