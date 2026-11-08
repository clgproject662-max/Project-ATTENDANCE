const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
    login,
    getMe,
    logout,
    createStaff,
    listStaff,
    updateStaff,
    selectClass
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Rate limiting on login to prevent brute force attacks (10 attempts per 15 minutes)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        message: 'Too many login attempts from this IP, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Public authentication routes
router.post('/login', loginLimiter, login);

// Authenticated session route
router.get('/me', protect, getMe);

// Choose CS1 / CS2 / CS3 after logging in with the common staff account
router.post('/select-class', protect, selectClass);

// Logout route
router.post('/logout', protect, logout);

// Admin-only staff account management routes
router.post('/staff', protect, requireRole('admin'), createStaff);
router.get('/staff', protect, requireRole('admin'), listStaff);
router.put('/staff/:id', protect, requireRole('admin'), updateStaff);

module.exports = router;
