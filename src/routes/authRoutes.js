import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { createToken, requireAuth } from '../middleware/auth.js';

const router = Router();

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !validateEmail(email) || !password || password.length < 8) {
      return res.status(400).json({ message: 'Name, valid email, and 8+ character password are required' });
    }

    const exists = await User.exists({ email: String(email).toLowerCase() });
    if (exists) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      passwordHash
    });

    res.status(201).json({
      token: createToken(user),
      user: user.toClient()
    });
  } catch (error) {
    next(error);
  }
});

router.post('/signin', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || '').toLowerCase() }).select('+passwordHash');

    if (!user || !(await bcrypt.compare(String(password || ''), user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    res.json({
      token: createToken(user),
      user: user.toClient()
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toClient() });
});

export default router;
