const express = require('express');
const router = express.Router();
const multer = require('multer');
const Product = require('../models/Product');
const {
    isLogin,
    isOwner
} = require('../middlewares/auth');

// ตั้งค่าเก็บรูป
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({
    storage
});

// แสดงรายการสินค้า
router.get('/', isLogin, async (req, res) => {
    const products = await Product.find();
    res.render('products/index', {
        products
    });
});

// ฟอร์มเพิ่มสินค้า
router.get('/add', isLogin, isOwner, (req, res) => {
    res.render('products/add');
});

// บันทึกเพิ่มสินค้า + รูป
router.post('/add', isLogin, isOwner, upload.single('image'), async (req, res) => {
    const {
        name,
        sku,
        barcode,
        price,
        cost,
        stock,
        category
    } = req.body;

    await Product.create({
        name,
        sku,
        barcode,
        price,
        cost,
        stock,
        category,
        image: req.file ? req.file.filename : null
    });

    res.redirect('/products');
});

// ฟอร์มแก้ไข
router.get('/edit/:id', isLogin, isOwner, async (req, res) => {
    const product = await Product.findById(req.params.id);
    res.render('products/edit', {
        product
    });
});

// บันทึกแก้ไข
router.post('/edit/:id', isLogin, isOwner, upload.single('image'), async (req, res) => {
    const {
        name,
        sku,
        barcode,
        price,
        cost,
        stock,
        category
    } = req.body;

    const data = {
        name,
        sku,
        barcode,
        price,
        cost,
        stock,
        category
    };
    if (req.file) data.image = req.file.filename;

    await Product.findByIdAndUpdate(req.params.id, data);
    res.redirect('/products');
});

// ลบสินค้า
router.post('/delete/:id', isLogin, isOwner, async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/products');
});

module.exports = router;