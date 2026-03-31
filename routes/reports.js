const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const {
    isLogin,
    isOwner
} = require('../middlewares/auth');

router.get('/daily', isLogin, isOwner, async (req, res) => {
    try {
        let selectedDate = req.query.date ? new Date(req.query.date) : new Date();
        
        // Start of the selected day
        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);

        // End of the selected day
        const end = new Date(selectedDate);
        end.setHours(23, 59, 59, 999);

        // Fetch sales within the day, populating product to get cost
        const sales = await Sale.find({
            createdAt: {
                $gte: start,
                $lte: end
            },
            status: 'paid'
        }).populate('items.product').sort({ createdAt: -1 });

        let totalSales = 0;
        let totalCost = 0;
        let totalProfit = 0;
        let totalOrders = sales.length;

        // Calculate cost and profit for each sale
        const processedSales = sales.map(sale => {
            let saleCost = 0;

            sale.items.forEach(item => {
                // Prefer cost snapshot saved at checkout, then fall back to current product cost.
                const costPerUnit = typeof item.cost === 'number'
                    ? item.cost
                    : (item.product ? item.product.cost : 0);
                saleCost += (costPerUnit * item.qty);
            });

            // Profit = Net Total (after discount) - Total Cost
            const saleProfit = sale.total - saleCost;
            
            totalSales += sale.total;
            totalCost += saleCost;
            totalProfit += saleProfit;

            return {
                ...sale.toObject(),
                totalCost: saleCost,
                profit: saleProfit
            };
        });

        res.render('reports/daily', {
            sales: processedSales,
            summary: {
                totalSales,
                totalCost,
                totalProfit,
                totalOrders
            },
            selectedDate: start // pass to view for the date picker
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error generating report');
    }
});

router.get('/monthly', isLogin, isOwner, async (req, res) => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const sales = await Sale.find({
        createdAt: {
            $gte: start
        },
        status: 'paid'
    });
    res.render('reports/monthly', {
        sales
    });
});

module.exports = router;
