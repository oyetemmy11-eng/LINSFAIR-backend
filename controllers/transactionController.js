const Transaction = require('../models/Transaction');
const User = require('../models/User');

const serializeTransaction = (t) => ({
  _id: t._id,
  description: t.description,
  amount: t.amount,
  currency: t.currency,
  type: t.type,
  date: new Date(t.date).toISOString(),
});

// Helper: apply a transaction's effect on a user's balance
const applyToBalance = (user, amount, currency, type) => {
  const delta = type === 'income' ? amount : -amount;
  if (currency === 'NGN') {
    user.nairaBalance += delta;
  } else {
    user.dollarBalance += delta;
  }
};

// Helper: reverse a transaction's effect on a user's balance
const reverseFromBalance = (user, amount, currency, type) => {
  const delta = type === 'income' ? amount : -amount;
  if (currency === 'NGN') {
    user.nairaBalance -= delta;
  } else {
    user.dollarBalance -= delta;
  }
};

// GET /api/transactions
const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.userId });
    res.json(transactions.map(serializeTransaction));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// POST /api/transactions
const addTransaction = async (req, res) => {
  const { amount, currency, description, type } = req.body;
  if (!amount || !currency || !description || !type) {
    return res.status(400).json({ error: 'amount, currency, description, and type are required' });
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }
  if (!['NGN', 'USD'].includes(currency)) {
    return res.status(400).json({ error: 'Currency must be NGN or USD' });
  }
  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'Type must be income or expense' });
  }
  try {
    const transaction = new Transaction({ user: req.userId, amount, currency, description, type });
    await transaction.save();

    const user = await User.findById(req.userId);
    applyToBalance(user, amount, currency, type);
    await user.save();

    res.status(201).json(serializeTransaction(transaction));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// PUT /api/transactions/:id
const updateTransaction = async (req, res) => {
  const { amount, currency, description, type } = req.body;
  if (!amount || !currency || !description || !type) {
    return res.status(400).json({ error: 'amount, currency, description, and type are required' });
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }
  if (!['NGN', 'USD'].includes(currency)) {
    return res.status(400).json({ error: 'Currency must be NGN or USD' });
  }
  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'Type must be income or expense' });
  }
  try {
    const oldTransaction = await Transaction.findById(req.params.id);
    if (!oldTransaction) return res.status(404).json({ error: 'Transaction not found' });
    if (oldTransaction.user.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const user = await User.findById(req.userId);

    // Reverse old transaction effect
    reverseFromBalance(user, oldTransaction.amount, oldTransaction.currency, oldTransaction.type);

    // Apply new transaction effect
    applyToBalance(user, amount, currency, type);
    await user.save();

    const updated = await Transaction.findByIdAndUpdate(
      req.params.id,
      { amount, currency, description, type },
      { new: true }
    );

    res.json(serializeTransaction(updated));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE /api/transactions/:id
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    if (transaction.user.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const user = await User.findById(req.userId);
    reverseFromBalance(user, transaction.amount, transaction.currency, transaction.type);
    await user.save();

    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = { getTransactions, addTransaction, updateTransaction, deleteTransaction };
