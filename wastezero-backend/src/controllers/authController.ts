import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
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
    console.error(err.message);
    res.status(500).send('Server Error');
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
        res.json({ token, role: user.role, name: user.name });
      }
    );
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, username, location } = req.body;
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

    if (name) user.name = name;
    if (location !== undefined) user.location = location;

    await user.save();
    res.json({ message: 'Profile updated successfully', user: {
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      location: user.location
    }});
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
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
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
