const express = require('express');
const config = require('config');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const passport = require('./auth/passport');
const dbConnect = require('./database/mongodb');


const routes = require('./router')(passport);
const api = express();
const db = dbConnect();

api
    .use(function (req, res, next) {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', '"GET,POST,PUT,DELETE');

        next();
    })
    .use(express.static(path.join(__dirname, 'public')))
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({ extended: true }))
    .use(passport.initialize())
    .use('/', routes)
    .listen(config.api.port, () => {
        console.log('Api starting in http://localhost:' + config.api.port);
    });

