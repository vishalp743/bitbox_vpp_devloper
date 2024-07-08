const mongoose = require('mongoose');

const serialNumberSchema = new mongoose.Schema({
    serialNumber: String,
    modelNumber: String
   
});

const SerialNumber = mongoose.model('SerialNumber', serialNumberSchema);

module.exports = SerialNumber;
