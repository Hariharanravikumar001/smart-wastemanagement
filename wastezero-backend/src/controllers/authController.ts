import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import WasteRequest from '../models/WasteRequest';
import Application from '../models/Application';
import Message from '../models/Message';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendEmail } from '../utils/emailService';
import crypto from 'crypto';

let _googleClient: OAuth2Client | null = null;

const getGoogleClient = () => {
  if (_googleClient) return _googleClient;
  
  const clientId = process.env['GOOGLE_CLIENT_ID'];
  const clientSecret = process.env['GOOGLE_CLIENT_SECRET'];
  
  if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
    console.warn('⚠️ WARNING: GOOGLE_CLIENT_ID is not configured in backend .env file. Google Login will fail on token verification.');
  }
  
  _googleClient = new OAuth2Client(clientId || 'YOUR_GOOGLE_CLIENT_ID_HERE', clientSecret);
  return _googleClient;
};

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
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="background-color: #2e7d32; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 1px;">Welcome to WasteZero</h1>
        </div>
        <div style="padding: 40px; background-color: #ffffff; line-height: 1.6; color: #333333;">
          <p style="font-size: 18px; margin-bottom: 20px;">Hello <strong>${user.name}</strong>,</p>
          <p style="margin-bottom: 20px;">We're thrilled to have you join the <strong>WasteZero</strong> community! Your journey towards a sustainable future starts here. Your account as a <strong>${user.role}</strong> has been successfully created.</p>
          
          <div style="background-color: #f9f9f9; border-left: 4px solid #2e7d32; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <p style="margin: 0; font-weight: 600; color: #2e7d32;">Your Next Steps:</p>
            <ul style="margin-top: 10px; padding-left: 20px;">
              <li>Complete your profile setup</li>
              <li>Explore available waste collection requests</li>
              <li>Track your environmental impact</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 40px;">
            <a href="http://localhost:4200/login" style="background-color: #2e7d32; color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; display: inline-block; transition: background-color 0.3s ease;">Access Your Dashboard</a>
          </div>
        </div>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #888888; border-top: 1px solid #eeeeee;">
          <p style="margin: 0;">&copy; 2026 WasteZero Smart Waste Management Platform. All rights reserved.</p>
          <p style="margin: 5px 0 0 0;">You received this email because you registered on our platform.</p>
        </div>
      </div>
    `;
    
    // We send this asynchronously, no need to wait for it before giving response to user
    sendEmail(
      user.email, 
      'Welcome to WasteZero - Your Sustainable Journey Begins!', 
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

    const user = await User.findOne({
      $or: [
        { email },
        { username: email }
      ]
    });
    if (!user) {
      res.status(400).json({ message: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password as string);
    if (!isMatch) {
      res.status(400).json({ message: 'Invalid email or password' });
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
          profileImage: user.profileImage,
          skills: user.skills,
          bio: user.bio,
          created_at: user.created_at
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
      
      const oldEmail = user.email;
      user.email = email;

      // Send notifications for email change
      const emailUpdateHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #1565c0; padding: 25px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0;">Security Alert: Email Updated</h2>
          </div>
          <div style="padding: 40px; background-color: #ffffff; line-height: 1.6; color: #333333;">
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>We're writing to confirm that the email address associated with your WasteZero account has been successfully updated.</p>
            
            <div style="background-color: #fff9c4; border-left: 4px solid #fbc02d; padding: 15px; margin: 25px 0;">
              <p style="margin: 0;"><strong>Old Email:</strong> ${oldEmail}</p>
              <p style="margin: 0;"><strong>New Email:</strong> ${email}</p>
            </div>

            <p>If you made this change, you can safely ignore this email. If you did <strong>not</strong> authorize this change, please contact our security team immediately at <a href="mailto:security@wastezero.com" style="color: #1565c0;">security@wastezero.com</a>.</p>
          </div>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #888888;">
            <p style="margin: 0;">WasteZero Smart Waste Management Platform</p>
          </div>
        </div>
      `;

      // Notify NEW email
      sendEmail(
        email,
        'WasteZero - Email Address Updated',
        `Your email address has been updated to ${email}.`,
        emailUpdateHtml
      );

      // Notify OLD email (for security)
      if (oldEmail) {
        sendEmail(
          oldEmail,
          'WasteZero - Security Alert: Email Changed',
          `The email address for your account has been changed to ${email}.`,
          emailUpdateHtml
        );
      }
    }

    if (name) user.name = name;
    if (location !== undefined) user.location = location;
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (skills !== undefined) user.skills = skills;
    if (req.body.bio !== undefined) user.bio = req.body.bio;

    await user.save();
    res.json({ message: 'Profile updated successfully', user: {
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      location: user.location,
      profileImage: user.profileImage,
      skills: user.skills,
      bio: user.bio,
      created_at: user.created_at
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

export const getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.params['id']).select('-password');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(user);
    } catch (err: any) {
        console.error('Get User By ID Error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.user!.id).select('-password').lean();
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(user);
    } catch (err: any) {
        console.error('Get Me Error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getUserStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const total = await User.countDocuments();
        const volunteers = await User.countDocuments({ role: 'volunteer' });
        const citizens = await User.countDocuments({ role: { $in: ['user', 'citizen'] } });
        const admins = await User.countDocuments({ role: { $in: ['admin', 'ngo'] } });
        const suspended = await User.countDocuments({ suspended: true });

        res.json({ total, volunteers, regularUsers: citizens, admins, suspended });
    } catch (err: any) {
        console.error('Get User Stats Error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
        res.json(users);
    } catch (err: any) {
        console.error('Get All Users Error:', err.message);
        res.status(500).json({ message: 'Server error' });
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
export const uploadProfileImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { profileImage } = req.body;
    if (!profileImage) {
      res.status(400).json({ message: 'No image provided' });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.profileImage = profileImage;
    await user.save();

    res.json({ message: 'Profile image updated successfully', profileImage: user.profileImage });
  } catch (err: any) {
    console.error('Image Upload Error:', err.message);
    res.status(500).json({ message: 'Server error during image upload' });
  }
};

export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      res.status(400).json({ message: 'IdToken is required' });
      return;
    }

    const googleClient = getGoogleClient();
    const googleClientId = process.env['GOOGLE_CLIENT_ID'];

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: googleClientId || 'YOUR_GOOGLE_CLIENT_ID_HERE',
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ message: 'Invalid Google token payload' });
      return;
    }

    const { email, name, picture } = payload;
    let user = await User.findOne({ email });

    if (!user) {
      // User does not exist, return 404 with profile info for registration redirect
      res.status(404).json({ 
        message: 'User not found. Please complete registration.',
        googleData: {
          email,
          name,
          picture
        }
      });
      return;
    }

    // User exists. Update profile picture if it's missing
    if (!user.profileImage && picture) {
      user.profileImage = picture;
      await user.save();
    }

    // Generate platform JWT
    const jwtPayload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    const secret = process.env['JWT_SECRET'] || 'wastezero_secret_token';

    jwt.sign(
      jwtPayload,
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
          profileImage: user.profileImage,
          skills: user.skills,
          bio: user.bio,
          created_at: user.created_at
        });
      }
    );
  } catch (err: any) {
    console.error('Google Login Error:', err.message);
    res.status(400).json({ message: 'Google authentication failed' });
  }
};
