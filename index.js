const functions = require("@google-cloud/functions-framework")
const { handler } = require("./qrcode")

functions.http('getQRCodes',async (req, res) => {
    try {
        const qrcodes = await handler(req.body)
        res.status(201).send({ qrcodes : qrcodes })
    } catch (e){
        if(e.name === "TypeError") res.status(404).send({ error : { name : e.name, message : e.message, code : e.code } })
        else res.status(500).send({ error : { name : e.name, message : e.message, code : e.code } })
    }
})