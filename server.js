/* flownode */

const express = require('express')
require('dotenv').config()

const app = express()

app.set('Content-Security-Policy', 'connect-src *.google-analytics.com; script-src-elem \'unsafe-inline\' www.googletagmanager.com;')

app.use('/flows', express.static('flows'))
app.use('/web', express.static('web'))

app.listen(process.env.PORT, () => {
    console.log(`Listening on ${process.env.PORT}`)
})