const express = require('express');
const router = express.Router();
const Lock = require('../models/Lock');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST api/locks
// @desc    Create a new safety lock
router.post('/', auth, async (req, res) => {
    const { amount, currency, purpose, dueDate, guardianUsername } = req.body;
    try {
        const user = await User.findById(req.userId);
        const guardian = await User.findOne({ username: guardianUsername });

        if (!guardian) return res.status(404).json({ error: 'Guardian not found' });
        if (guardian._id.equals(user._id)) return res.status(400).json({ error: 'You cannot be your own guardian' });

        const balanceField = currency === 'USD' ? 'dollarBalance' : 'nairaBalance';
        if (user[balanceField] < amount) return res.status(400).json({ error: 'Insufficient balance' });

        // Deduct balance
        user[balanceField] -= amount;
        await user.save();

        const lock = new Lock({
            owner: user._id,
            guardian: guardian._id,
            amount,
            currency,
            purpose,
            dueDate,
        });

        await lock.save();
        res.json(lock);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET api/locks
// @desc    Get all locks for current user
router.get('/', auth, async (req, res) => {
    try {
        const locks = await Lock.find({ owner: req.userId })
            .populate('guardian', 'username')
            .select('-__v');
        res.json(locks);
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
        res.json(requests);
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
            lock.status = 'released';
            const owner = await User.findById(lock.owner);
            const balanceField = lock.currency === 'USD' ? 'dollarBalance' : 'nairaBalance';
            owner[balanceField] += lock.amount;
            await owner.save();
        } else {
            lock.status = 'active';
        }

        await lock.save();
        res.json(lock);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   POST api/locks/:id/release
// @desc    Standard release after due date
router.post('/:id/release', auth, async (req, res) => {
    try {
        const lock = await Lock.findOne({ _id: req.params.id, owner: req.userId });
        if (!lock) return res.status(404).json({ error: 'Lock not found' });
        if (new Date() < new Date(lock.dueDate)) return res.status(400).json({ error: 'Due date has not passed yet' });

        lock.status = 'released';
        const owner = await User.findById(lock.owner);
        const balanceField = lock.currency === 'USD' ? 'dollarBalance' : 'nairaBalance';
        owner[balanceField] += lock.amount;

        await owner.save();
        await lock.save();
        res.json(lock);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
