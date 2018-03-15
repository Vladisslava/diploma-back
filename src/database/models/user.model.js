const mongoose = require('mongoose');
const crypto = require('crypto');

const UserSchema = mongoose.Schema({
    username: String,
    email: String,
    passwordHash: String,
    salt: String
});

UserSchema.virtual('password')
    .set(function (password) {
       this._plainPassword = password;
       if (password) {
           this.salt = crypto.randomBytes(128).toString('base64');
           this.passwordHash = crypto.pbkdf2Sync(password, this.salt, 1, 128, 'sha1').toString('base64');
       } else {
           this.salt = undefined;
           this.passwordHash = undefined;
       }
    })
    .get(function () {
        return this._plainPassword;
    });

UserSchema.methods.checkPassword = function (password) {
    if (!password) return false;
    if (!this.passwordHash) return false;

    return crypto.pbkdf2Sync(password, this.salt, 1, 128, 'sha1').toString('base64') === this.passwordHash;
};

module.exports = mongoose.model('User', UserSchema);