const mongoose = require('mongoose');
const config = require('../config/default');

module.exports = function () {
    mongoose.Promise = global.Promise;

    mongoose.connect(config.db.url, { useNewUrlParser: true })
        .then(() => {console.log('Connection succesful');})
        .catch((err) => console.error(err));

    return mongoose.connection;
};
