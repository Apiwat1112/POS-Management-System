const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const generatePayload = require('promptpay-qr');
const qrcode = require('qrcode');

const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Member = require('../models/Member');
const {
    isLogin
} = require('../middlewares/auth');

const ALLOWED_PAYMENT_METHODS = ['cash', 'transfer', 'promptpay'];
const ALLOWED_DISCOUNT_TYPES = ['none', 'percent', 'amount'];

function generatePaymentReference() {
    return 'PAY-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function buildPendingSaleData({
    rawItems,
    paymentMethod,
    discountRaw,
    discountType,
    memberId,
    redeemPoints,
    employeeId
}) {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
        throw Object.assign(new Error('No items'), {
            statusCode: 400
        });
    }

    if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
        throw Object.assign(new Error('Invalid payment method'), {
            statusCode: 400
        });
    }

    if (!ALLOWED_DISCOUNT_TYPES.includes(discountType)) {
        throw Object.assign(new Error('Invalid discount type'), {
            statusCode: 400
        });
    }

    if (!Number.isFinite(discountRaw) || discountRaw < 0) {
        throw Object.assign(new Error('Invalid discount value'), {
            statusCode: 400
        });
    }

    if (!Number.isFinite(redeemPoints) || redeemPoints < 0) {
        throw Object.assign(new Error('Invalid redeem points'), {
            statusCode: 400
        });
    }

    const normalizedItems = new Map();

    for (const item of rawItems) {
        const productId = String(item?.product || '').trim();
        const qty = Number(item?.qty);

        if (!productId || !Number.isInteger(qty) || qty <= 0) {
            throw Object.assign(new Error('Invalid sale item'), {
                statusCode: 400
            });
        }

        normalizedItems.set(productId, (normalizedItems.get(productId) || 0) + qty);
    }

    const productIds = [...normalizedItems.keys()];
    const products = await Product.find({
        _id: {
            $in: productIds
        }
    });

    if (products.length !== productIds.length) {
        throw Object.assign(new Error('Some products were not found'), {
            statusCode: 400
        });
    }

    const productMap = new Map(products.map(product => [String(product._id), product]));
    const saleItems = [];
    let subtotal = 0;

    for (const [productId, qty] of normalizedItems.entries()) {
        const product = productMap.get(productId);

        if (!product) {
            throw Object.assign(new Error('Some products were not found'), {
                statusCode: 400
            });
        }

        if (product.stock < qty) {
            throw Object.assign(new Error(`Insufficient stock for ${product.name}`), {
                statusCode: 400
            });
        }

        const lineTotal = product.price * qty;
        subtotal += lineTotal;

        saleItems.push({
            product: product._id,
            name: product.name,
            price: product.price,
            cost: product.cost || 0,
            qty,
            total: lineTotal
        });
    }

    let promoDiscount = 0;
    if (discountType === 'percent') {
        promoDiscount = (subtotal * discountRaw) / 100;
    } else if (discountType === 'amount') {
        promoDiscount = discountRaw;
    }

    let member = null;
    let validRedeemPoints = 0;

    if (memberId) {
        member = await Member.findById(memberId);

        if (!member) {
            throw Object.assign(new Error('Member not found'), {
                statusCode: 400
            });
        }

        if (redeemPoints > 0) {
            validRedeemPoints = Math.min(redeemPoints, member.point);
        }
    }

    const totalDiscountAmount = Math.min(promoDiscount + validRedeemPoints, subtotal);
    const total = Math.max(0, subtotal - totalDiscountAmount);

    return {
        saleData: {
            items: saleItems,
            subtotal,
            discount: totalDiscountAmount,
            promoDiscount,
            redeemedPoints: validRedeemPoints,
            total,
            paymentMethod,
            status: 'pending',
            paymentReference: generatePaymentReference(),
            qrExpiresAt: paymentMethod === 'promptpay'
                ? new Date(Date.now() + (15 * 60 * 1000))
                : null,
            employee: employeeId,
            member: member ? member._id : null
        },
        member,
        validRedeemPoints
    };
}

async function finalizeSalePayment(sale, providerData = {}) {
    if (!sale) {
        throw Object.assign(new Error('Sale not found'), {
            statusCode: 404
        });
    }

    if (sale.status === 'paid') {
        return sale;
    }

    if (sale.status !== 'pending') {
        throw Object.assign(new Error('Sale is not pending'), {
            statusCode: 400
        });
    }

    const stockUpdates = [];

    try {
        for (const item of sale.items) {
            const updatedProduct = await Product.findOneAndUpdate({
                _id: item.product,
                stock: {
                    $gte: item.qty
                }
            }, {
                $inc: {
                    stock: -item.qty
                }
            }, {
                new: true
            });

            if (!updatedProduct) {
                throw Object.assign(new Error(`Insufficient stock for ${item.name}`), {
                    statusCode: 400
                });
            }

            stockUpdates.push({
                productId: item.product,
                qty: item.qty
            });
        }

        if (sale.member) {
            const member = await Member.findById(sale.member);

            if (member) {
                const earnedPoints = Math.floor(sale.total / 100);
                const redeemedPoints = Math.max(0, Math.min(Number(sale.redeemedPoints || 0), member.point));
                const pointDiff = earnedPoints - redeemedPoints;

                await Member.findByIdAndUpdate(member._id, {
                    $inc: {
                        point: pointDiff
                    }
                });
            }
        }

        sale.status = 'paid';
        sale.provider = providerData.provider || sale.provider || null;
        sale.providerPayload = providerData.payload || sale.providerPayload || null;
        sale.paymentConfirmedAt = providerData.confirmedAt || new Date();
        sale.finalizedAt = new Date();
        await sale.save();

        return sale;
    } catch (err) {
        if (stockUpdates.length > 0) {
            await Promise.all(stockUpdates.map(update => Product.findByIdAndUpdate(update.productId, {
                $inc: {
                    stock: update.qty
                }
            })));
        }

        throw err;
    }
}

router.get('/', isLogin, async (req, res) => {
    try {
        const products = await Product.find({
            stock: {
                $gt: 0
            }
        });
        const members = await Member.find().sort({
            name: 1
        });

        res.render('sales/index', {
            products,
            members
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.post('/create-order', isLogin, async (req, res) => {
    try {
        const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
        const paymentMethod = req.body?.paymentMethod || 'cash';
        const discountRaw = Number(req.body?.discount || 0);
        const discountType = req.body?.discountType || 'none';
        const memberId = req.body?.memberId || null;
        const redeemPoints = Number(req.body?.redeemPoints || 0);

        const {
            saleData
        } = await buildPendingSaleData({
            rawItems,
            paymentMethod,
            discountRaw,
            discountType,
            memberId,
            redeemPoints,
            employeeId: req.session.user.id
        });

        const sale = await Sale.create(saleData);

        res.json({
            orderId: sale._id,
            paymentReference: sale.paymentReference,
            total: sale.total,
            status: sale.status
        });
    } catch (err) {
        console.error(err);
        res.status(err.statusCode || 500).json({
            error: err.message || 'Unable to create order'
        });
    }
});

router.post('/finalize-order/:id', isLogin, async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id);
        const finalizedSale = await finalizeSalePayment(sale, {
            provider: req.body?.provider || 'manual',
            payload: req.body || null,
            confirmedAt: new Date()
        });

        res.json({
            success: true,
            receiptPath: '/sales/receipt/' + finalizedSale._id
        });
    } catch (err) {
        console.error(err);
        res.status(err.statusCode || 500).json({
            error: err.message || 'Unable to finalize order'
        });
    }
});

router.get('/generate-qr', isLogin, async (req, res) => {
    try {
        const orderId = req.query.orderId;
        const sale = await Sale.findById(orderId);

        if (!sale) {
            return res.status(404).json({
                error: 'Order not found'
            });
        }

        if (sale.status !== 'pending') {
            return res.status(400).json({
                error: 'Order is no longer pending'
            });
        }

        if (sale.paymentMethod !== 'promptpay') {
            return res.status(400).json({
                error: 'QR is available only for PromptPay orders'
            });
        }

        const promptpayId = process.env.PROMPTPAY_ID || '0000000000000';
        const payload = generatePayload(promptpayId, {
            amount: sale.total
        });
        const qrImage = await qrcode.toDataURL(payload);

        res.json({
            qrImage,
            amount: sale.total,
            paymentReference: sale.paymentReference,
            expiresAt: sale.qrExpiresAt
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: 'Unable to generate QR Code'
        });
    }
});

router.get('/payment-status/:id', isLogin, async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id);

        if (!sale) {
            return res.status(404).json({
                error: 'Order not found'
            });
        }

        res.json({
            orderId: sale._id,
            status: sale.status,
            paymentReference: sale.paymentReference,
            receiptPath: sale.status === 'paid' ? '/sales/receipt/' + sale._id : null
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: 'Unable to get payment status'
        });
    }
});

router.post('/webhook/payment', async (req, res) => {
    try {
        const incomingSecret = req.headers['x-webhook-secret'];
        const expectedSecret = process.env.PAYMENT_WEBHOOK_SECRET;

        if (expectedSecret && incomingSecret !== expectedSecret) {
            return res.status(401).json({
                error: 'Invalid webhook secret'
            });
        }

        const paymentReference = String(req.body?.paymentReference || '').trim();
        const paymentStatus = String(req.body?.status || '').toLowerCase();

        if (!paymentReference) {
            return res.status(400).json({
                error: 'Missing payment reference'
            });
        }

        if (paymentStatus !== 'paid' && paymentStatus !== 'success') {
            return res.status(200).json({
                success: true,
                ignored: true
            });
        }

        const sale = await Sale.findOne({
            paymentReference
        });

        if (!sale) {
            return res.status(404).json({
                error: 'Order not found'
            });
        }

        const finalizedSale = await finalizeSalePayment(sale, {
            provider: req.body?.provider || 'provider-webhook',
            payload: req.body,
            confirmedAt: req.body?.confirmedAt ? new Date(req.body.confirmedAt) : new Date()
        });

        res.json({
            success: true,
            orderId: finalizedSale._id,
            status: finalizedSale.status
        });
    } catch (err) {
        console.error(err);
        res.status(err.statusCode || 500).json({
            error: err.message || 'Webhook processing failed'
        });
    }
});

router.post('/verify-slip', isLogin, async (req, res) => {
    try {
        const orderId = req.body?.orderId;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                error: 'Missing orderId'
            });
        }

        const sale = await Sale.findById(orderId);
        const finalizedSale = await finalizeSalePayment(sale, {
            provider: 'slip-simulation',
            payload: req.body,
            confirmedAt: new Date()
        });

        res.json({
            success: true,
            data: {
                orderId: finalizedSale._id,
                paymentReference: finalizedSale.paymentReference,
                date: new Date().toLocaleString('th-TH')
            }
        });
    } catch (err) {
        console.error(err);
        res.status(err.statusCode || 500).json({
            success: false,
            error: err.message || 'Unable to verify slip'
        });
    }
});

router.get('/receipt/:id', isLogin, async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id)
            .populate('member')
            .populate('employee', 'name role');

        if (!sale) {
            return res.status(404).send('Sale not found');
        }

        res.render('sales/receipt', {
            sale
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
