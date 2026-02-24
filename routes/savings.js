const express = require('express');
const router = express.Router();
const SavingsPlan = require('../models/SavingsPlan');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST api/savings
// @desc    Create a new automated savings plan
router.post('/', auth, async (req, res) => {
    const { title, targetAmount, currency, frequency, amountPerFrequency, nextContributionDate } = req.body;
    try {
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
        res.json(plan);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET api/savings
// @desc    Get all savings plans for current user
router.get('/', auth, async (req, res) => {
    try {
        const plans = await SavingsPlan.find({ user: req.userId }).select('-__v');
        res.json(plans);
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

        if (user[balanceField] < amount) return res.status(400).json({ error: 'Insufficient balance' });

        user[balanceField] -= amount;
        plan.currentAmount += amount;

        if (plan.currentAmount >= plan.targetAmount) {
            plan.status = 'completed';
        }

        await user.save();
        await plan.save();

        res.json(plan);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
