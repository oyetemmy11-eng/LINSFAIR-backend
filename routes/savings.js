const express = require('express');
const router = express.Router();
const SavingsPlan = require('../models/SavingsPlan');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

const serializePlan = (p) => ({
    _id: p._id,
    title: p.title,
    targetAmount: p.targetAmount,
    currentAmount: p.currentAmount,
    currency: p.currency,
    frequency: p.frequency,
    amountPerFrequency: p.amountPerFrequency,
    nextContributionDate: new Date(p.nextContributionDate).toISOString(),
    status: p.status
});

// @route   POST api/savings
// @desc    Create a new automated savings plan
router.post('/', auth, async (req, res) => {
    const { title, targetAmount, currency, frequency, amountPerFrequency, nextContributionDate } = req.body;
    try {
        if (typeof targetAmount !== 'number' || targetAmount <= 0) {
            return res.status(400).json({ error: 'targetAmount must be a positive number' });
        }
        if (typeof amountPerFrequency !== 'number' || amountPerFrequency <= 0) {
            return res.status(400).json({ error: 'amountPerFrequency must be a positive number' });
        }
        const plan = new SavingsPlan({
            user: req.userId,
            title,
            targetAmount,
            currency,
            frequency,
            amountPerFrequency,
            nextContributionDate,
        });
        await plan.save();
        res.json(serializePlan(plan));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET api/savings
// @desc    Get all savings plans for current user
router.get('/', auth, async (req, res) => {
    try {
        const plans = await SavingsPlan.find({ user: req.userId }).select('-__v');
        res.json(plans.map(serializePlan));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   POST api/savings/:id/contribute
// @desc    Manually contribute to a savings plan
router.post('/:id/contribute', auth, async (req, res) => {
    const { amount } = req.body;
    try {
        const plan = await SavingsPlan.findOne({ _id: req.params.id, user: req.userId });
        if (!plan) return res.status(404).json({ error: 'Savings plan not found' });

        const user = await User.findById(req.userId);
        const balanceField = plan.currency === 'USD' ? 'dollarBalance' : 'nairaBalance';

        const numAmount = Number(amount);
        if (!Number.isFinite(numAmount) || numAmount <= 0) {
            return res.status(400).json({ error: 'Amount must be a positive number' });
        }
        if (user[balanceField] < numAmount) return res.status(400).json({ error: 'Insufficient balance' });

        user[balanceField] -= numAmount;
        plan.currentAmount += numAmount;

        if (plan.currentAmount >= plan.targetAmount) {
            plan.status = 'completed';
        }

        await user.save();
        await plan.save();

        // Create transaction record for manual contribution
        const tx = new Transaction({
            user: req.userId,
            amount: numAmount,
            currency: plan.currency,
            description: `Manual contribution to savings: ${plan.title}`,
            type: 'expense',
            date: new Date()
        });
        await tx.save();

        res.json(serializePlan(plan));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
