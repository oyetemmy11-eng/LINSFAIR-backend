const express = require('express');
const router = express.Router();
const Lock = require('../models/Lock');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

const serializeLock = (l) => ({
    _id: l._id,
    amount: l.amount,
    currency: l.currency,
    purpose: l.purpose,
    dueDate: new Date(l.dueDate).toISOString(),
    status: l.status,
    guardian: l.guardian && l.guardian.username ? { username: l.guardian.username } : undefined
});

// @route   POST api/locks
// @desc    Create a new safety lock
router.post('/', auth, async (req, res) => {
    const { amount, currency, purpose, dueDate, guardianUsername } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        if (typeof amount !== 'number' || amount <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Amount must be a positive number' });
        }
        const user = await User.findById(req.userId).session(session);
        const guardian = await User.findOne({ username: guardianUsername }).session(session);

        if (!guardian) {
            await session.abortTransaction();
            return res.status(404).json({ error: 'Guardian not found' });
        }
        if (guardian._id.equals(user._id)) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'You cannot be your own guardian' });
        }

        const balanceField = currency === 'USD' ? 'dollarBalance' : 'nairaBalance';
        if (user[balanceField] < amount) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Deduct balance
        user[balanceField] -= Number(amount);
        await user.save({ session });

        const lock = new Lock({
            owner: user._id,
            guardian: guardian._id,
            amount: Number(amount),
            currency,
            purpose,
            dueDate,
        });
        await lock.save({ session });

        // Create transaction record
        const transaction = new Transaction({
            user: user._id,
            amount: Number(amount),
            currency,
            description: `Safety Lock created: ${purpose}`,
            type: 'expense',
            date: new Date()
        });
        await transaction.save({ session });

        await session.commitTransaction();
        const populated = await Lock.findById(lock._id).populate('guardian', 'username');
        res.json(serializeLock(populated));
    } catch (err) {
        await session.abortTransaction();
        res.status(500).json({ error: err.message });
    } finally {
        session.endSession();
    }
});

// @route   GET api/locks
// @desc    Get all locks for current user
router.get('/', auth, async (req, res) => {
    try {
        const locks = await Lock.find({ owner: req.userId })
            .populate('guardian', 'username')
            .select('-__v');
        res.json(locks.map(serializeLock));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET api/locks/requests
// @desc    Get all unlock requests for guardian
router.get('/requests', auth, async (req, res) => {
    try {
        const requests = await Lock.find({
            guardian: req.userId,
            status: 'unlock_requested'
        })
            .populate('owner', 'username')
            .select('-__v');
        res.json(requests.map(l => ({
            _id: l._id,
            amount: l.amount,
            currency: l.currency,
            purpose: l.purpose,
            dueDate: new Date(l.dueDate).toISOString(),
            status: l.status,
            owner: l.owner && l.owner.username ? { username: l.owner.username } : undefined
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   POST api/locks/:id/request
// @desc    Request early unlock (owner only)
router.post('/:id/request', auth, async (req, res) => {
    try {
        const lock = await Lock.findOne({ _id: req.params.id, owner: req.userId });
        if (!lock) return res.status(404).json({ error: 'Lock not found' });
        if (lock.status !== 'active') return res.status(400).json({ error: 'Lock is not active' });

        lock.status = 'unlock_requested';
        await lock.save();
        res.json(lock);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   POST api/locks/:id/approve
// @desc    Approve/Reject early unlock (guardian only)
router.post('/:id/approve', auth, async (req, res) => {
    const { action } = req.body; // 'approve' or 'reject'
    try {
        const lock = await Lock.findOne({ _id: req.params.id, guardian: req.userId });
        if (!lock) return res.status(404).json({ error: 'Lock not found' });

        if (action === 'approve') {
            lock.status = 'available';
        } else {
            lock.status = 'active';
        }

        await lock.save();
        const populated = await Lock.findById(lock._id).populate('guardian', 'username');
        res.json(serializeLock(populated));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   POST api/locks/:id/release
// @desc    Release when available or past due date
router.post('/:id/release', auth, async (req, res) => {
    try {
        const lock = await Lock.findOne({ _id: req.params.id, owner: req.userId });
        if (!lock) return res.status(404).json({ error: 'Lock not found' });
        const now = new Date();
        const duePassed = now >= new Date(lock.dueDate);
        if (!(lock.status === 'available' || duePassed)) {
            return res.status(400).json({ error: 'Lock is not available for release yet' });
        }

        lock.status = 'released';
        const owner = await User.findById(lock.owner);
        const balanceField = lock.currency === 'USD' ? 'dollarBalance' : 'nairaBalance';
        owner[balanceField] += lock.amount;

        await owner.save();
        await lock.save();
        const populated = await Lock.findById(lock._id).populate('guardian', 'username');
        res.json(serializeLock(populated));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
