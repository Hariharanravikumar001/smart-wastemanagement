import express from 'express';
import { registerUser, loginUser, updateProfile, changePassword } from '../controllers/authController';
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

export default router;
