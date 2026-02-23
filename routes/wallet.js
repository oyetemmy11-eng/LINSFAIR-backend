const express = require('express');
const auth = require('../middleware/auth');
const { getBalances, updateBalances } = require('../controllers/walletController');

const router = express.Router();

router.get('/', auth, getBalances);
router.put('/', auth, updateBalances);

module.exports = router;
