const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');

const BoxSchema = mongoose.Schema({
    name: String,
    dateEnd: Number,
    dateDistribution: Number,
    isPrivate: Boolean,
    password: String,
    users: Array,
    description: String,
    creator: String
});

BoxSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Box', BoxSchema);