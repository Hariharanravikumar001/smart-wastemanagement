import express from 'express';
import { registerUser, loginUser, updateProfile, changePassword, forgotPassword, verifyOtp, resetPassword, deleteAccount } from '../controllers/authController';
import { authProtect } from '../middleware/authMiddleware';

const router = express.Router();

// @route   POST api/register
// @desc    Register a user
// @access  Public
router.post('/register', registerUser);

// @route   POST api/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', loginUser);

// @route   PUT api/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authProtect, updateProfile);

// @route   PUT api/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', authProtect, changePassword);

// @route   POST api/forgot-password
// @desc    Send password reset OTP
// @access  Public
router.post('/forgot-password', forgotPassword);

// @route   POST api/verify-otp
// @desc    Verify password reset OTP
// @access  Public
router.post('/verify-otp', verifyOtp);

// @route   POST api/reset-password
// @desc    Reset password using OTP
// @access  Public
router.post('/reset-password', resetPassword);

// @route   DELETE api/profile
// @desc    Delete user account and data
// @access  Private
router.delete('/profile', authProtect, deleteAccount);

export default router;
