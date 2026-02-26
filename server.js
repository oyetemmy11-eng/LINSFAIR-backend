const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { runAutomation } = require('./services/automationService');

dotenv.config();

const app = express();

// Security headers
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Body parsing with size limit
app.use(express.json({ limit: '10kb' }));

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: { error: 'Too many requests, please try again later' },
});
// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/locks', require('./routes/locks'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/savings', require('./routes/savings'));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/walletapp';
mongoose.connect(mongoUri)
  .then(() => {
    console.log('MongoDB connected');

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);

      // Schedule automation runner: Every 24 hours
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      setInterval(() => {
        runAutomation();
      }, TWENTY_FOUR_HOURS);

      // Initial run on startup
      console.log('[Scheduler] Initial automation check triggered on startup');
      runAutomation();
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
