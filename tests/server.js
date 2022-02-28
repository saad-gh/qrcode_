require('env-yaml').config();

const { service } = require("../service")
const port = 3000

service.listen(port, () => {
    console.log(`http://localhost:${port}`)
})