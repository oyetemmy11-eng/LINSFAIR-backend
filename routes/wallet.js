const express = require('express');
const jwt = require('jsonwebtoken');
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

// Get wallet balances
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({ nairaBalance: user.nairaBalance, dollarBalance: user.dollarBalance });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update balances (for transactions)
router.put('/', auth, async (req, res) => {
  const { nairaBalance, dollarBalance } = req.body;
  try {
    const user = await User.findByIdAndUpdate(req.userId, { nairaBalance, dollarBalance }, { new: true });
    res.json({ nairaBalance: user.nairaBalance, dollarBalance: user.dollarBalance });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;