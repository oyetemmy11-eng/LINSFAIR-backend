const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// GET /api/user
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -refreshToken');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// PUT /api/user
const updateProfile = async (req, res) => {
  const { username, password } = req.body;
  try {
    const updates = {};
    if (username) updates.username = username;
    if (password) updates.password = await bcrypt.hash(password, 10);

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select('-password -refreshToken');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE /api/user
const deleteAccount = async (req, res) => {
  try {
    await Transaction.deleteMany({ user: req.userId });
    await User.findByIdAndDelete(req.userId);
    res.json({ message: 'Account and all transactions deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = { getProfile, updateProfile, deleteAccount };
