// models/Reseller.js
const mongoose = require('mongoose');

const resellerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: String
});

module.exports = mongoose.model('Reseller', resellerSchema);
