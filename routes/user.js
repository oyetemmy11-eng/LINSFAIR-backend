const express = require('express');
const auth = require('../middleware/auth');
const { getProfile, updateProfile, deleteAccount } = require('../controllers/userController');

const router = express.Router();

router.get('/', auth, getProfile);
router.put('/', auth, updateProfile);
router.delete('/', auth, deleteAccount);

module.exports = router;
