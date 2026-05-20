const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { formatUser, isValidEmail } = require('../utils/helpers');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', (req, res) => {
  try {
    const { username, email, password, full_name, role } = req.body;

    // Validation
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({ error: 'All fields are required: username, email, password, full_name' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const db = getDb();

    // Check if username or email already exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash password and create user
    const password_hash = bcrypt.hashSync(password, 10);
    const userRole = role && ['developer', 'viewer'].includes(role) ? role : 'developer';

    // Generate random avatar color
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    const avatar_color = colors[Math.floor(Math.random() * colors.length)];

    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash, role, full_name, avatar_color) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(username, email, password_hash, userRole, full_name, avatar_color);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: formatUser(user),
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Login and get JWT token
 */
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token,
      user: formatUser(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/profile
 * Get current user profile (requires auth)
 */
router.get('/profile', authenticate, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: formatUser(user) });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/users
 * List all users (admin only shows all, others see basic info)
 */
router.get('/users', authenticate, (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare('SELECT id, username, full_name, role, avatar_color, created_at FROM users').all();
    res.json({ users });
  } catch (err) {
    console.error('Users list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
