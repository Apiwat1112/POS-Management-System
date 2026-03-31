const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        name: String,
        price: Number,
        cost: {
            type: Number,
            default: 0
        },
        qty: Number,
        total: Number
    }],
    subtotal: Number,
    discount: {
        type: Number,
        default: 0
    },
    promoDiscount: {
        type: Number,
        default: 0
    },
    redeemedPoints: {
        type: Number,
        default: 0
    },
    total: Number,
    paymentMethod: String, // cash / transfer / promptpay
    status: {
        type: String,
        enum: ['pending', 'paid', 'cancelled'],
        default: 'pending'
    },
    paymentReference: {
        type: String,
        index: true
    },
    provider: {
        type: String,
        default: null
    },
    providerPayload: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    paymentConfirmedAt: {
        type: Date,
        default: null
    },
    finalizedAt: {
        type: Date,
        default: null
    },
    qrExpiresAt: {
        type: Date,
        default: null
    },
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    member: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member'
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.Sale || mongoose.model('Sale', saleSchema);
