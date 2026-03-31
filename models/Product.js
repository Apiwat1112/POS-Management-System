const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    sku: {
        type: String,
        unique: true
    },
    barcode: {
        type: String,
        unique: true
    },
    price: {
        type: Number,
        required: true
    },
    cost: {
        type: Number,
        default: 0
    },
    stock: {
        type: Number,
        default: 0
    },
    category: {
        type: String
    },
    image: {
        type: String
    } // เก็บชื่อไฟล์รูป
}, {
    timestamps: true
});

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);