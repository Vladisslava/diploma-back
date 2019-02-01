const mongoose = require('mongoose');

const ActivationTokenSchema = mongoose.Schema({
    username: {
        type: String
    },
    token: String,
    active: Boolean
});

module.exports = mongoose.model('ActivationToken', ActivationTokenSchema);