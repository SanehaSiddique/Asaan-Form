const express = require('express');
const { signup, login, forgotPassword, verifyOTP, resetPassword } = require('../controller/authController');
const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);


module.exports = router;