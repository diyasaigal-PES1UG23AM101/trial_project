const express = require('express');
const router = express.Router();
const { registerEmployee, loginEmployee, getCurrentEmployee } = require('../controllers/employee.controller');
const { authenticateToken } = require('../middleware/auth');

// Register employee
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, fullName, employeeId, department } = req.body;
    const pool = req.app.locals.pool;

    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const result = await registerEmployee(pool, username, email, password, fullName, employeeId, department);
    res.status(201).json(result);
  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    if (error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error registering employee' });
  }
});

// Login employee
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const pool = req.app.locals.pool;

    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await loginEmployee(pool, username, password);
    res.json(result);
  } catch (error) {
    if (error.message === 'Invalid username or password') {
      return res.status(401).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error logging in' });
  }
});

// Verify token and get current employee
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    if (!req.user.userId) {
      return res.status(400).json({ error: 'User ID not found in token' });
    }

    const result = await getCurrentEmployee(pool, req.user.userId);
    res.json(result);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error verifying token' });
  }
});

// Logout employee
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;

