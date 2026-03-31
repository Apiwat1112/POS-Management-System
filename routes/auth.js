const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const Employee = require('../models/Employee');

router.get('/login', (req, res) => {
    res.render('auth/login');
});

router.post('/login', async (req, res) => {
    const {
        login,
        password
    } = req.body; // login = email หรือ username

    const user = await Employee.findOne({
        $or: [{
            email: login
        }, {
            username: login
        }]
    });

    if (!user) {
        return res.render('auth/login', {
            error: 'ข้อมูลไม่ถูกต้อง'
        });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
        return res.render('auth/login', {
            error: 'ข้อมูลไม่ถูกต้อง'
        });
    }

    req.session.user = {
        id: user._id,
        name: user.name,
        role: user.role
    };

    res.redirect('/');
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/auth/login'));
});

module.exports = router;