"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// @route   POST api/register
// @desc    Register a user
// @access  Public
router.post('/register', authController_1.registerUser);
// @route   POST api/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', authController_1.loginUser);
// @route   POST api/google-login
// @desc    Authenticate user via Google Login
// @access  Public
router.post('/google-login', authController_1.googleLogin);
// @route   GET api/me
// @desc    Get current user profile (Lightweight)
// @access  Private
router.get('/me', authMiddleware_1.authProtect, authController_1.getMe);
// @route   PUT api/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authMiddleware_1.authProtect, authController_1.updateProfile);
// @route   POST api/upload-profile-image
// @desc    Upload profile image
// @access  Private
router.post('/upload-profile-image', authMiddleware_1.authProtect, authController_1.uploadProfileImage);
// @route   PUT api/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', authMiddleware_1.authProtect, authController_1.changePassword);
// @route   POST api/forgot-password
// @desc    Send password reset OTP
// @access  Public
router.post('/forgot-password', authController_1.forgotPassword);
// @route   POST api/verify-otp
// @desc    Verify password reset OTP
// @access  Public
router.post('/verify-otp', authController_1.verifyOtp);
// @route   POST api/reset-password
// @desc    Reset password using OTP
// @access  Public
router.post('/reset-password', authController_1.resetPassword);
// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/users/:id', authMiddleware_1.authProtect, authController_1.getUserById);
// @route   DELETE api/profile
// @desc    Delete user account and data
// @access  Private
router.delete('/profile', authMiddleware_1.authProtect, authController_1.deleteAccount);
// @route   GET api/users
// @desc    Get all users (Admin only)
// @access  Private
router.get('/users', authMiddleware_1.authProtect, authController_1.getAllUsers);
exports.default = router;
