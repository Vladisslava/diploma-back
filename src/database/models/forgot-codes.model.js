const mongoose = require('mongoose');

const ForgotCodesSchema = mongoose.Schema({
    email: String,
    code: String
});

module.exports = mongoose.model('ForgotCodes', ForgotCodesSchema);