const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['NGN', 'USD'], required: true },
    category: {
        type: String,
        enum: ['utility', 'mobile', 'internet', 'rent', 'subscription', 'other'],
        default: 'utility'
    },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    autoPay: { type: Boolean, default: false },
    paidAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bill', billSchema);
