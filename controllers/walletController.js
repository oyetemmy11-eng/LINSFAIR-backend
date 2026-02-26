const User = require('../models/User');

// GET /api/wallet
const getBalances = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ nairaBalance: user.nairaBalance, dollarBalance: user.dollarBalance });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// PUT /api/wallet
const updateBalances = async (req, res) => {
  const { nairaBalance, dollarBalance } = req.body;
  if (nairaBalance === undefined || dollarBalance === undefined) {
    return res.status(400).json({ error: 'nairaBalance and dollarBalance are required' });
  }
  if (typeof nairaBalance !== 'number' || typeof dollarBalance !== 'number') {
    return res.status(400).json({ error: 'Balances must be numbers' });
  }
  try {
    const user = await User.findByIdAndUpdate(req.userId, { nairaBalance, dollarBalance }, { new: true });
    res.json({ nairaBalance: user.nairaBalance, dollarBalance: user.dollarBalance });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = { getBalances, updateBalances };
