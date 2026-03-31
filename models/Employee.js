const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
    name: String,
    email: String,
    username: String,
    password: String,
    role: {
        type: String,
        enum: ['employee', 'owner'],
        default: 'employee'
    }
});

module.exports = mongoose.model('Employee', EmployeeSchema);