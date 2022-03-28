const QRCode = require("qrcode-svg")
const PDFDocument = require("pdfkit")
const { XMLParser } = require("fast-xml-parser")
const { drive } = require('./libs/auth');
const Bottleneck = require('bottleneck/es5')

function qrcode(parameters) {
    return new QRCode(parameters).svg()
}

function cmToPts(number){
    return 72 * number / 2.54
}

function getMargin(pageConfig){

    // set default margins
    const marginObject = {}
    if(pageConfig.border === undefined) {
        ["top", "right", "bottom", "left"].forEach(loc => marginObject[loc] = 72)
        return marginObject
    }

    // get comma separated margins into array
    const margins = isNaN(pageConfig.border) ? pageConfig.border.split(",") : [pageConfig.border]

    // set same or differnt margins
    if(margins.length === 1) ["top", "right", "bottom", "left"].forEach(loc => marginObject[loc] = cmToPts(margins[0]))
    else if (margins.length > 1) {
        ["top", "right", "bottom", "left"].forEach((loc, i) => {
            if(margins[i] === undefined || margins[i] === "") marginObject[loc] = 0
            else marginObject[loc] = cmToPts(margins[i])
        })
    }
    
    return marginObject
}

// create new file
function newFile(doc, fileName, folderId) {
    return drive.files.create({
      resource: {
        name: fileName,
        parents: [folderId]
      },
      media: {
        mimeType: 'application/pdf',
        body: doc
      },
      fields: 'id,webViewLink',
      supportsAllDrives: true
    });
}

// create new folder
function newFolder(folderName, mainFolderId){
    return drive.files.create({
        resource: {
            'name': folderName,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents' : [mainFolderId]
        },
        fields: 'id,webViewLink',
        supportsAllDrives: true
    })
}

// https://stackoverflow.com/questions/33289726/combination-of-async-function-await-settimeout
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function pdfGenerator() {

    // iterate over all qrcodes info
    const files = []
    for(let i = 0; i < this.qrcodesInfo.length; i++){
        let info = this.qrcodesInfo[i]
    
        // initialize new pdf document
        const doc = new PDFDocument({ autoFirstPage : false })

        // add page with specified dimensions
        doc.addPage({ size : this.pageCfg.size, margins : this.pageCfg.margins })

        // get qrcode svg 
        this.qrcodeCfg.content = `AMZN,PO:${info.shippingId},FNSKU:${info.fnsku},QTY:${info.qty}`
        const svg = qrcode(this.qrcodeCfg);

        // update pdf with svg path
        doc.translate((doc.page.width - this.qrcodeCfg.width) / 2, this.pageCfg.margins.top)
        .path(this.parser.parse(svg).svg.path["@_d"])
        .fill()

        // get qr code caption
        let caption = this.pageCfg.text;
        ["sku", "qty"].forEach(key => caption = caption.replace("${" + key + "}", info[key]))

        // update pdf with caption
        doc.translate(-(doc.page.width - this.qrcodeCfg.width) / 2, -this.pageCfg.margins.top)
        .text(
            this.qrcodeCfg.content, 
            (doc.widthOfString(caption) + this.pageCfg.margins.left) / 2,
            // + 10 pts for some gap between qrcode and caption 
            this.pageCfg.margins.top + cmToPts(this.requestBody.qrcode.height) + 10, 
            { align : 'center' }
        )
        .text(
            caption, 
            (doc.widthOfString(caption) + this.pageCfg.margins.left) / 2,
            undefined,
            { align : 'center' }
        )

        // get file
        const fileName = `${info.shippingId}_${info.sku}_QTY${info.qty}.pdf`
        const promise = this.limiter.schedule(() => newFile(doc, fileName, this.folder.data.id))
        doc.end()
        files.push(promise)
    }

    return files
}

async function handler(requestBody) {

    // create new folder
    const parentFolderId = requestBody.gdrive.folderId
    const folderName = 
        new Date().toLocaleString('en-GB', { month : '2-digit', day : '2-digit', year : 'numeric' }).split('/').reverse().join("-")
        + " "
        + requestBody.data[0].shippingId
    const folder = await newFolder(folderName, parentFolderId)

    // get page config
    const pageCfg = requestBody.page;
    // sanitizing page config
    for(let option in pageCfg) if(pageCfg[option] === "") delete pageCfg[option]
    // set margins
    pageCfg.margins = getMargin(pageCfg)
    // set page dimension
    if(pageCfg.format !== undefined) pageCfg.size = pageCfg.format
    else {
        if(pageCfg.width !== undefined && pageCfg.height !== undefined) {
            pageCfg.size = [
                cmToPts(pageCfg.width),
                cmToPts(pageCfg.height)
            ]
        } else throw new TypeError("page size information not found")
    }

    // pdfGenerator dependencies
    pdfGenerator.requestBody = requestBody
    pdfGenerator.qrcodesInfo = requestBody.data
    pdfGenerator.folder = folder
    pdfGenerator.pageCfg = pageCfg
    pdfGenerator.parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix : "@_"
    });
    pdfGenerator.qrcodeCfg = {
        padding : 0,
        width : cmToPts(requestBody.qrcode.width),
        height : cmToPts(requestBody.qrcode.height),
        join : true
    }
    pdfGenerator.limiter = new Bottleneck({
        minTime : 5,
        maxConcurrent : 10
    })

    const files = await Promise.all(pdfGenerator.call(pdfGenerator))
    return files.map((file, i) =>  ({
        url : folder.data.webViewLink,
        sku : pdfGenerator.qrcodesInfo[i].sku
    }))
}

module.exports = {
    handler : handler,
    qrcode : qrcode,
    newFolder : newFolder,
    upload : newFile,
    timeout : timeout
}