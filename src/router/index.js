const router = require('express').Router();
const authRoutes = require('./auth.route');
const boxRoutes = require('./box.route');

module.exports = function (passport) {
    router
        .use('/api', authRoutes())
        .use('/api', boxRoutes(passport));

    return router;
};