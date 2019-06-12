const path = require('path');
const express = require('express');
const https = require('https');
const config = require('./config/default');
const bodyParser = require('body-parser');
const passport = require('./auth/passport');
const dbConnect = require('./database/mongodb');
const logger = require('morgan');
const fileUpload = require('express-fileupload');

const routes = require('./router')(passport);
const api = express();
const port = process.env.PORT || config.api.port;

dbConnect();

api
    .use(function (req, res, next) {
        res.set('Access-Control-Allow-Origin', "*");
        res.set('Access-Control-Allow-Methods', '"GET,POST,PUT,DELETE');
        res.set("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

        next();
    })
    .use(logger(function (tokens, req, res) {
        return [
            tokens.method(req, res),
            tokens.url(req, res),
            tokens.status(req, res),
            tokens.res(req, res, 'content-length'), '-',
            tokens['response-time'](req, res), 'ms'
        ].join(' ')
    }))
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({ extended: true }))
    .use(fileUpload({
        limits: { fileSize: 50 * 1024 * 1024 },
    }))
    .use(express.static(path.join(__dirname, '..', 'public')))
    .use(passport.initialize())
    .use('/', routes);

setTimeout(() => {
    /*https.createServer({
        key: fs.readFileSync(config.https.key),
        cert: fs.readFileSync(config.https.cert),
    }, api)
        .listen(port);
    console.log('Api starting in https://localhost:' + port);*/


    api.listen(port, () => {
        console.log('Api starting in http://localhost:' + port);
    });
}, 2000);

