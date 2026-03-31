const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Member = require('../models/Member');
const { isLogin } = require('../middlewares/auth');

router.get('/', isLogin, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch all data in parallel
        const [
            todaysSales,
            totalProducts,
            totalMembers,
            recentSales
        ] = await Promise.all([
            Sale.find({
                createdAt: {
                    $gte: today
                },
                status: 'paid'
            }),
            Product.countDocuments(),
            Member.countDocuments(),
            Sale.find({
                status: 'paid'
            }).sort({
                createdAt: -1
            }).limit(5).populate('employee', 'name').populate('member', 'name')
        ]);

        let sumSalesToday = 0;
        let ordersToday = todaysSales.length;

        todaysSales.forEach(sale => {
            sumSalesToday += sale.total;
        });

        res.render('index', {
            metrics: {
                sumSalesToday,
                ordersToday,
                totalProducts,
                totalMembers
            },
            recentSales
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error fetching dashboard data');
    }
});

module.exports = router;
