const express = require('express');
const router = express.Router();
const Member = require('../models/Member');
const {
    isLogin
} = require('../middlewares/auth');

// แสดงรายชื่อสมาชิก
router.get('/', isLogin, async (req, res) => {
    const members = await Member.find();
    res.render('members/index', {
        members
    });
});

// ฟอร์มเพิ่ม
router.get('/add', isLogin, (req, res) => {
    res.render('members/add');
});

// บันทึกเพิ่ม
router.post('/add', isLogin, async (req, res) => {
    const {
        name,
        phone,
        point
    } = req.body;
    await Member.create({
        name,
        phone,
        point
    });
    res.redirect('/members');
});

// ฟอร์มแก้ไข
router.get('/edit/:id', isLogin, async (req, res) => {
    const member = await Member.findById(req.params.id);
    res.render('members/edit', {
        member
    });
});

// บันทึกแก้ไข
router.post('/edit/:id', isLogin, async (req, res) => {
    const {
        name,
        phone,
        point
    } = req.body;
    await Member.findByIdAndUpdate(req.params.id, {
        name,
        phone,
        point
    });
    res.redirect('/members');
});

// ลบ
router.post('/delete/:id', isLogin, async (req, res) => {
    await Member.findByIdAndDelete(req.params.id);
    res.redirect('/members');
});

module.exports = router;