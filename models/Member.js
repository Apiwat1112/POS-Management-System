const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    point: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('Member', memberSchema);