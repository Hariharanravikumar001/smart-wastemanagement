import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import User from '../models/User';
import WasteRequest from '../models/WasteRequest';
import Application from '../models/Application';
import Message from '../models/Message';
import { AuthRequest } from '../middleware/authMiddleware';

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

    // Use environment variables for SMTP details
    const transporter = nodemailer.createTransport({
      service: process.env['EMAIL_SERVICE'] || 'gmail',
      auth: {
        user: process.env['EMAIL_USER'] || 'your-email@gmail.com',
        pass: process.env['EMAIL_PASS'] || 'your-app-password',
      },
    });

    const info = await transporter.sendMail({
      from: `"WasteZero Support" <${process.env['EMAIL_USER'] || 'support@wastezero.com'}>`,
      to: user.email,
      subject: 'WasteZero - Password Reset OTP',
      text: `Your password reset OTP is: ${otp}. It will expire in 15 minutes.`,
      html: `<p>Your password reset OTP is: <strong>${otp}</strong>.</p><p>It will expire in 15 minutes.</p>`,
    });

    console.log('OTP Email sent to: %s', user.email);

    res.json({ 
      message: 'OTP sent successfully to email'
    });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
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
    console.error(err.message);
    res.status(500).send('Server Error');
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
    console.error(err.message);
    res.status(500).send('Server Error');
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
