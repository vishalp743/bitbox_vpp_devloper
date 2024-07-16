const mongoose = require('mongoose');

const serialNumberSchema = new mongoose.Schema({
    serialNumber: { type: String, required: true },
    modelNumber: { type: String, required: true },
    testedBy: { type: String, required: true },
    uploadedFile: { type: String, required: true },
    processor: { type: String, required: true },
    motherboard: { type: String, required: true },
    ram: { type: String, required: true },
    ssd: { type: String, required: true },
    hdd: { type: String, required: true },
    monitorSize: { type: String, required: true }
});

const SerialNumber = mongoose.model('SerialNumber', serialNumberSchema);

module.exports = SerialNumber;
