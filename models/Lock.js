const mongoose = require('mongoose');

const lockSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    guardian: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['NGN', 'USD'], required: true },
    purpose: { type: String, required: true },
    dueDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ['active', 'unlock_requested', 'released', 'rejected', 'available'],
        default: 'active'
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lock', lockSchema);
