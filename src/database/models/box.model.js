const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');

const BoxSchema = mongoose.Schema({
    name: String,
    dateEnd: Number,
    isPrivate: Boolean,
    password: String,
    users: Array,
    description: String,
    authorId: String
});

BoxSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Box', BoxSchema);