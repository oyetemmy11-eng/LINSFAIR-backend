const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nairaBalance: { type: Number, default: 0 },
  dollarBalance: { type: Number, default: 0 },
  refreshToken: { type: String, default: null },
});

module.exports = mongoose.model('User', userSchema);
