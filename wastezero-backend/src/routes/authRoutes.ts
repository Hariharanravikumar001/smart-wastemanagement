import express from 'express';
import { registerUser, loginUser, googleLogin, getMe, getUserStats, updateProfile, changePassword, forgotPassword, verifyOtp, resetPassword, deleteAccount, getUserById, getAllUsers, uploadProfileImage } from '../controllers/authController';
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

// @route   POST api/google-login
// @desc    Authenticate user via Google Login
// @access  Public
router.post('/google-login', googleLogin);

// @route   GET api/me
// @desc    Get current user profile (Lightweight)
// @access  Private
router.get('/me', authProtect, getMe);

// @route   PUT api/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authProtect, updateProfile);

// @route   POST api/upload-profile-image
// @desc    Upload profile image
// @access  Private
router.post('/upload-profile-image', authProtect, uploadProfileImage);

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

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/users/:id', authProtect, getUserById);

// @route   DELETE api/profile
// @desc    Delete user account and data
// @access  Private
router.delete('/profile', authProtect, deleteAccount);

// @route   GET api/users
// @desc    Get all users (Admin only)
// @access  Private
router.get('/users', authProtect, getAllUsers);

export default router;
