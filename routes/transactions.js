const express = require('express');
const auth = require('../middleware/auth');
const { getTransactions, addTransaction, updateTransaction, deleteTransaction } = require('../controllers/transactionController');

const router = express.Router();

router.get('/', auth, getTransactions);
router.post('/', auth, addTransaction);
router.put('/:id', auth, updateTransaction);
router.delete('/:id', auth, deleteTransaction);

module.exports = router;
