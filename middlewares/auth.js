exports.isLogin = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    next();
};

exports.isOwner = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'owner') {
        return res.send('⛔ เฉพาะ Owner เท่านั้นที่เข้าถึงหน้านี้ได้');
    }
    next();
};