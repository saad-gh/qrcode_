const { auth } = require("@googleapis/drive");
const { request } = require("gaxios")
const process = require('process')

const client = new auth.GoogleAuth({
  keyFile: '\.env.json',
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

async function getIdToken(){
  const token = await client.getAccessToken()
  const response = await request({
      url: 'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/googleapirunner%40mtc-platform.iam.gserviceaccount.com:generateIdToken',
      method : 'POST',
      headers : {
          "Accept" : 'application/json',
          "Content-Type" : 'application/json',
          "Authorization" : 'Bearer ' + token
      },
      data : {"audience":process.env.client_id}
  })

  return response.data.token
}


const skus = count => ({ 
    "gdrive" : { "folderId": "17e9MU_W1gtZ9np1ZaOjKwVIE08EiDDI7" },
    "page": { "border": 0, "height": "", "width": "", "format": "A4", "text": "${sku} qty / ctn ${qty}" }, 
    "qrcode": { "width": 21, "height": 21 }, 
    "data": 
      new Array(count)
      .fill({ "shippingId": "S1", "qty": 9, "fnsku":"X0011NVVEH" })
      .map((sku, i) => { sku.sku = "sku"; return sku }) 
  })

module.exports = {
    skus : skus
}

module.exports.getIdToken = getIdToken