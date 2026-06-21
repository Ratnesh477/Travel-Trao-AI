import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { isMockDbEnabled, MockUser } from '../config/mockDb';

const getJwtSecret = () => process.env.JWT_SECRET || 'fallback_jwt_secret_token_123456';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (isMockDbEnabled()) {
      const existingUser = await MockUser.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'A user with this email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await MockUser.create({
        email,
        password: hashedPassword
      });

      const token = jwt.sign(
        { id: newUser.id, email: newUser.email },
        getJwtSecret(),
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        token,
        user: {
          id: newUser.id,
          email: newUser.email
        }
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      email,
      password: hashedPassword
    });

    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: {
        id: newUser._id,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal Server Error during registration' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (isMockDbEnabled()) {
      const user = await MockUser.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        getJwtSecret(),
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        token,
        user: {
          id: user.id,
          email: user.email
        }
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal Server Error during login' });
  }
};

