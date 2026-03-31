const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); // หรือ bcrypt
const Employee = require('../models/Employee');
const {
    isLogin,
    isOwner
} = require('../middlewares/auth');

router.get('/', isLogin, async (req, res) => {
    const employees = await Employee.find();
    res.render('employees/index', {
        employees
    });
});

router.get('/add', isLogin, isOwner, (req, res) => {
    res.render('employees/add');
});

router.post('/add', isLogin, isOwner, async (req, res) => {
    const {
        name,
        email,
        username,
        password,
        role
    } = req.body;
    const hash = await bcrypt.hash(password, 10);

    await Employee.create({
        name,
        email,
        username,
        password: hash,
        role
    });

    res.redirect('/employees');
});

// 👉 ฟอร์มแก้ไข
router.get('/edit/:id', isLogin, isOwner, async (req, res) => {
    const employee = await Employee.findById(req.params.id);
    res.render('employees/edit', {
        employee
    });
});

// 👉 บันทึกแก้ไข
router.post('/edit/:id', isLogin, isOwner, async (req, res) => {
    const {
        name,
        email,
        username,
        password,
        role
    } = req.body;

    const data = {
        name,
        email,
        username,
        role
    };

    if (password && password.trim() !== '') {
        data.password = await bcrypt.hash(password, 10);
    }

    await Employee.findByIdAndUpdate(req.params.id, data);
    res.redirect('/employees');
});

// 👉 ลบ
router.post('/delete/:id', isLogin, isOwner, async (req, res) => {
    await Employee.findByIdAndDelete(req.params.id);
    res.redirect('/employees');
});

module.exports = router;