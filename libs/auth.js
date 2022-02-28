const { auth, drive } = require('@googleapis/drive');
const process = require('process')

// create googleauth object for Google APIs
function authorizeGoogleAPI() {
    return new auth.JWT(
        process.env.client_email,
        null,
        process.env.private_key.replace(/\\n/gm, '\n'),
        ['https://www.googleapis.com/auth/drive']);
}

const token = authorizeGoogleAPI()

module.exports = {
    drive: drive({ version: 'v3', auth: token }),
    token: token
}