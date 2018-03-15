const mongoose = require('mongoose');

const BoxSchema = mongoose.Schema({
    name: String,
    dateEnd: Number,
    isPrivate: Boolean,
    password: String,
    users: Array,
    description: String,
    authorId: String
});

module.exports = mongoose.model('Box', BoxSchema);