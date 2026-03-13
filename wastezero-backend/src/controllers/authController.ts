import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import WasteRequest from '../models/WasteRequest';
import Application from '../models/Application';
import Message from '../models/Message';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendEmail } from '../utils/emailService';
import crypto from 'crypto';

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, username, email, password, role, location } = req.body;

    let user = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (user) {
      const field = user.email === email ? 'Email' : 'Username';
      res.status(400).json({ message: `${field} already exists` });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      name,
      username: username || name,
      email,
      password: hashedPassword,
      role: role ? role.toLowerCase() : 'user',
      location
    });

    await user.save();

    // Send Welcome Email
    const welcomeHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2e7d32;">Welcome to WasteZero!</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Thank you for joining WasteZero - Smart Waste Management Platform. We're excited to have you as a <strong>${user.role}</strong>.</p>
        <p>Our platform helps you manage waste efficiently and contribute to a cleaner environment.</p>
        <div style="background: #f1f8e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Your Dashboard is ready:</strong> <a href="http://localhost:4200/login" style="color: #2e7d32; text-decoration: none; font-weight: bold;">Log in Now</a></p>
        </div>
        <p>If you have any questions, feel free to reply to this email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #777;">WasteZero Smart Waste Management Platform</p>
      </div>
    `;
    
    // We send this asynchronously, no need to wait for it before giving response to user
    sendEmail(
      user.email, 
      'Welcome to WasteZero!', 
      `Hello ${user.name}, welcome to WasteZero. Your account as a ${user.role} has been created.`, 
      welcomeHtml
    ).then(success => {
       if (success) console.log(`✅ Welcome email sent to ${user.email}`);
       else console.error(`❌ Failed to send welcome email to ${user.email}`);
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err: any) {
    console.error('Registration Error:', err.message);
    if (err.message.includes('buffering timed out') || err.name === 'MongooseServerSelectionError' || err.message.includes('topology was destroyed') || err.message.includes('bufferCommands = false')) {
      res.status(503).json({ message: 'Database connection failed. Please check your network or database whitelist.' });
    } else {
      res.status(500).json({ message: 'Server error during registration' });
    }
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ message: 'Invalid Credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password as string);
    if (!isMatch) {
      res.status(400).json({ message: 'Invalid Credentials' });
      return;
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    const secret = process.env['JWT_SECRET'] || 'wastezero_secret_token';

    jwt.sign(
      payload,
      secret,
      { expiresIn: '5h' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token, 
          id: user.id,
          role: user.role, 
          name: user.name,
          username: user.username,
          location: user.location,
          email: user.email,
          profileImage: user.profileImage
        });
      }
    );
  } catch (err: any) {
    console.error('Login Error:', err.message);
    if (err.message.includes('buffering timed out') || err.name === 'MongooseServerSelectionError' || err.message.includes('topology was destroyed') || err.message.includes('bufferCommands = false')) {
      res.status(503).json({ message: 'Database connection failed. Please check your network or database whitelist.' });
    } else {
      res.status(500).json({ message: 'Server error during login' });
    }
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, username, location, profileImage, skills, email } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'User not authorized' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if new username is already taken by another user
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        res.status(400).json({ message: 'Username already taken' });
        return;
      }
      user.username = username;
    }

    // Check if new email is already taken by another user
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        res.status(400).json({ message: 'Email already taken' });
        return;
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (location !== undefined) user.location = location;
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (skills !== undefined) user.skills = skills;

    await user.save();
    res.json({ message: 'Profile updated successfully', user: {
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      location: user.location,
      profileImage: user.profileImage
    }});
  } catch (err: any) {
    console.error('Profile Update Error:', err.message);
    if (err.message.includes('buffering timed out') || err.name === 'MongooseServerSelectionError' || err.message.includes('topology was destroyed') || err.message.includes('bufferCommands = false')) {
      res.status(503).json({ message: 'Database connection failed. Please check your network or database whitelist.' });
    } else {
      res.status(500).json({ message: 'Server error during profile update' });
    }
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'User not authorized' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password as string);
    if (!isMatch) {
      res.status(400).json({ message: 'Current password is incorrect' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err: any) {
    console.error('Password Change Error:', err.message);
    if (err.message.includes('buffering timed out') || err.name === 'MongooseServerSelectionError' || err.message.includes('topology was destroyed') || err.message.includes('bufferCommands = false')) {
      res.status(503).json({ message: 'Database connection failed. Please check your network or database whitelist.' });
    } else {
      res.status(500).json({ message: 'Server error during password change' });
    }
  }
};

// Generate OTP and send email
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiry to 15 minutes from now
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    // Use shared email service
    const subject = 'WasteZero - Password Reset OTP';
    const text = `Your password reset OTP is: ${otp}. It will expire in 15 minutes.`;
    const html = `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #2e7d32;">Password Reset Request</h2>
                <p>Hello,</p>
                <p>We received a request to reset your password for your WasteZero account.</p>
                <p>Your 6-digit OTP is:</p>
                <div style="font-size: 24px; font-weight: bold; color: #1565c0; padding: 10px; background: #f5f5f5; border-radius: 5px; display: inline-block;">${otp}</div>
                <p>This code will expire in 15 minutes.</p>
                <p>If you did not request this, please ignore this email.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777;">WasteZero Smart Waste Management Platform</p>
               </div>`;

    const emailSent = await sendEmail(user.email, subject, text, html);

    if (emailSent) {
      console.log('✅ OTP Email successfully sent to: %s', user.email);
    } else {
      console.error('❌ Failed to send reset email to: %s', user.email);
      // Fallback log for development
      console.log(`DEBUG: OTP for ${user.email} is ${otp}`);
    }

    res.json({ 
      message: 'OTP sent successfully (check console if email fails in dev)'
    });
  } catch (err: any) {
    console.error('Forgot Password Error:', err.message);
    res.status(500).json({ message: 'Server error during forgot password process' });
  }
};

// Verify OTP
export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    
    const user = await User.findOne({
      email,
      resetPasswordOtp: otp,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      res.status(400).json({ message: 'OTP is invalid or has expired' });
      return;
    }

    res.json({ message: 'OTP verified successfully' });
  } catch (err: any) {
    console.error('Verify OTP Error:', err.message);
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
};

// Reset Password
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
      email,
      resetPasswordOtp: otp,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      res.status(400).json({ message: 'OTP is invalid or has expired' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // Clear OTP fields
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();
    
    res.json({ message: 'Password has been reset successfully' });
  } catch (err: any) {
    console.error('Reset Password Error:', err.message);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};

// Delete Account
export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'User not authorized' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Delete all associated data
    // 1. Waste Requests
    await WasteRequest.deleteMany({
      $or: [{ citizenId: userId }, { volunteerId: userId }]
    });

    // 2. Applications
    await Application.deleteMany({ volunteer_id: userId });

    // 3. Messages
    await Message.deleteMany({
      $or: [{ sender_id: userId }, { receiver_id: userId }]
    });

    // 4. Finally delete the user
    await User.findByIdAndDelete(userId);

    res.json({ message: 'Account and all associated data deleted successfully' });
  } catch (err: any) {
    console.error('Account Deletion Error:', err.message);
    res.status(500).json({ message: 'Server error during account deletion' });
  }
};
