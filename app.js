require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();

mongoose.connect('mongodb://127.0.0.1:27017/posdb')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static('public'));

app.use(session({
    secret: 'pos-secret',
    resave: false,
    saveUninitialized: false
}));

// ส่ง user ไปใช้ในทุก view
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});



// ================= ROUTES =================
app.use('/auth', require('./routes/auth'));
app.use('/employees', require('./routes/employees'));
app.use('/members', require('./routes/members'));
app.use('/products', require('./routes/products'));
app.use('/sales', require('./routes/sales'));
app.use('/reports', require('./routes/reports'));


app.use('/', require('./routes/index'));

app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});