/* flownode */

const express = require('express')
require('dotenv').config()

const app = express()

app.set('Content-Security-Policy', 'connect-src *.google-analytics.com; script-src-elem \'unsafe-inline\' www.googletagmanager.com;')
app.set('Access-Control-Allow-Origin', '*')

app.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin', ['*']);
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.append('Access-Control-Allow-Headers', 'Content-Type');
    next();
})

app.use('/flows', express.static('flows'))
app.use('/', express.static('./'))

app.listen(process.env.PORT, () => {
    console.log(`Listening on ${process.env.PORT}`)
})