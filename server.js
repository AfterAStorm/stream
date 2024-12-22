/* flownode */

const express = require('express')
require('dotenv').config()

const app = express()

app.use('/flows', express.static('flows'))
app.use('/web', express.static('web'))

app.listen(process.env.PORT, () => {
    console.log(`Listening on ${process.env.PORT}`)
})