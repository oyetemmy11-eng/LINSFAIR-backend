const mongoose = require('mongoose');

const savingsPlanSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    currency: { type: String, enum: ['NGN', 'USD'], required: true },
    frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'manual'],
        default: 'weekly'
    },
    amountPerFrequency: { type: Number, required: true },
    nextContributionDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'completed', 'paused'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SavingsPlan', savingsPlanSchema);
