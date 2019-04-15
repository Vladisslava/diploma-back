const router = require('express').Router();
const authRoutes = require('./auth.route');
const boxRoutes = require('./box.route');
const userRoutes = require('./user.route');

module.exports = function (passport) {
    router
        .use('/api', authRoutes())
        .use('/api', boxRoutes(passport))
        .use('/api', userRoutes());

    return router;
};
