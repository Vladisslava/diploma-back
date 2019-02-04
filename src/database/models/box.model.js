const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');

const BoxSchema = mongoose.Schema({
    name: String,
    dateEnd: Date,
    dateDistribution: Date,
    isPrivate: Boolean,
    password: String,
    users: [{user: String, ward: String}],
    description: String,
    creator: String
});

BoxSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Box', BoxSchema);