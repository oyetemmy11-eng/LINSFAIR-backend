const express = require('express');
const jwt = require('jsonwebtoken');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const router = express.Router();

// Middleware to verify token
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get transactions
router.get('/', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.userId });
    res.json(transactions);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add transaction
router.post('/', auth, async (req, res) => {
  const { amount, currency, description, type } = req.body;
  try {
    const transaction = new Transaction({ user: req.userId, amount, currency, description, type });
    await transaction.save();

    // Update wallet balance
    const user = await User.findById(req.userId);
    if (currency === 'NGN') {
      user.nairaBalance += type === 'income' ? amount : -amount;
    } else {
      user.dollarBalance += type === 'income' ? amount : -amount;
    }
    await user.save();

    res.status(201).json(transaction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update transaction
router.put('/:id', auth, async (req, res) => {
  const { amount, currency, description, type } = req.body;
  try {
    const transaction = await Transaction.findByIdAndUpdate(req.params.id, { amount, currency, description, type }, { new: true });
    res.json(transaction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete transaction
router.delete('/:id', auth, async (req, res) => {
  try {
    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;