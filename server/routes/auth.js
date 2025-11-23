const express = require('express');
const { registerUser, loginUser, getUserProfile } = require('../controllers/authController');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 20, // More lenient in development
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and test routes
    return req.path === '/test' || req.path.includes('/health');
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes are working!'
  });
});

// Register route
router.post('/register', authLimiter, validateRegistration, registerUser);

// Login route
router.post('/login', authLimiter, validateLogin, loginUser);

// Profile route
router.get('/profile', authenticateToken, getUserProfile);

module.exports = router;
