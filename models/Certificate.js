const mongoose = require('mongoose');
const cron = require('node-cron');

const certificateSchema = new mongoose.Schema({
    serialNumber: {
        type: String,
        required: true,
    },
    certificateLink: {
        type: String,
        required: true,
    },
    OTP: { 
        type: String, 
        default: null 
    },
    otpTimestamp: { 
        type: Date,
        default: null 
    },
});

// Middleware to set otpTimestamp when OTP is set
certificateSchema.pre('save', function(next) {
    if (this.isModified('OTP') && this.OTP) {
        this.otpTimestamp = new Date();
    }
    next();
});

const Certificate = mongoose.model('Certificate', certificateSchema);

// Schedule a job to run every minute to check and delete expired OTPs
cron.schedule('* * * * *', async () => {
    const expirationTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    const now = new Date();
    await Certificate.updateMany(
        { otpTimestamp: { $lte: new Date(now - expirationTime) } },
        { $unset: { OTP: "", otpTimestamp: "" } }
    );
});

module.exports = Certificate;
