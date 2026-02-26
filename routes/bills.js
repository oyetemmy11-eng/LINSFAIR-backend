const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

const serializeBill = (b) => ({
    _id: b._id,
    title: b.title,
    amount: b.amount,
    currency: b.currency,
    category: b.category,
    dueDate: new Date(b.dueDate).toISOString(),
    autoPay: !!b.autoPay,
    status: b.status
});

// @route   POST api/bills
// @desc    Add a new bill to track
router.post('/', auth, async (req, res) => {
    const { title, amount, currency, category, dueDate, autoPay } = req.body;
    try {
        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ error: 'Amount must be a positive number' });
        }
        const bill = new Bill({
            user: req.userId,
            title,
            amount,
            currency,
            category,
            dueDate,
            autoPay: autoPay || false
        });
        await bill.save();
        res.json(serializeBill(bill));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET api/bills
// @desc    Get all bills for current user
router.get('/', auth, async (req, res) => {
    try {
        const bills = await Bill.find({ user: req.userId }).select('-__v').sort({ dueDate: 1 });
        res.json(bills.map(serializeBill));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   POST api/bills/:id/pay
// @desc    Pay a bill
router.post('/:id/pay', auth, async (req, res) => {
    try {
        const bill = await Bill.findOne({ _id: req.params.id, user: req.userId });
        if (!bill) return res.status(404).json({ error: 'Bill not found' });
        if (bill.status === 'paid') return res.status(400).json({ error: 'Bill already paid' });

        const user = await User.findById(req.userId);
        const balanceField = bill.currency === 'USD' ? 'dollarBalance' : 'nairaBalance';

        if (user[balanceField] < bill.amount) return res.status(400).json({ error: 'Insufficient balance' });

        user[balanceField] -= bill.amount;
        bill.status = 'paid';
        bill.paidAt = Date.now();

        // Create transaction record for manual bill payment
        const tx = new Transaction({
            user: req.userId,
            amount: bill.amount,
            currency: bill.currency,
            description: `Manual payment for bill: ${bill.title}`,
            type: 'expense',
            date: new Date()
        });

        await user.save();
        await bill.save();
        await tx.save();

        res.json(serializeBill(bill));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
