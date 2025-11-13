const express = require('express');
const router = express.Router();
const { loginAdmin, getCurrentAdmin, loginUser, getCurrentUser } = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Login endpoint - authenticates admin user
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Get pool from app locals (set in server.js)
    const pool = req.app.locals.pool;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const result = await loginAdmin(pool, username, password);
    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    
    if (error.message === 'Invalid username or password') {
      return res.status(401).json({ error: error.message });
    }
    
    // Return more detailed error in development
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Internal server error during login'
      : error.message || 'Internal server error during login';
    
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * POST /api/auth/user/login
 * Login endpoint for employee/users
 */
router.post('/user/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const pool = req.app.locals.pool;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const result = await loginUser(pool, username, password);
    res.json(result);
  } catch (error) {
    console.error('User login error:', error);

    if (error.message === 'Invalid username or password') {
      return res.status(401).json({ error: error.message });
    }

    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Internal server error during login'
      : error.message || 'Internal server error during login';
    
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * GET /api/auth/verify
 * Verify token and get current admin info
 */
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const result = await getCurrentAdmin(pool, req.user.adminId);
    res.json(result);
  } catch (error) {
    console.error('Verify error:', error);
    
    if (error.message === 'Admin not found') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Error verifying token' });
  }
});

/**
 * GET /api/auth/user/verify
 * Verify token for employees/users and return profile
 */
router.get('/user/verify', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    if (!req.user?.userId) {
      return res.status(403).json({ error: 'User authentication required' });
    }

    const result = await getCurrentUser(pool, req.user.userId);
    res.json(result);
  } catch (error) {
    console.error('User verify error:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Error verifying user token' });
  }
});

/**
 * POST /api/auth/logout
 * Logout endpoint (client-side token removal)
 */
router.post('/logout', authenticateToken, (req, res) => {
  // In a stateless JWT system, logout is primarily client-side
  // You can optionally blacklist tokens here or track sessions
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * POST /api/auth/user/logout
 * Logout endpoint for employees/users
 */
router.post('/user/logout', authenticateToken, (req, res) => {
  if (!req.user?.userId) {
    return res.status(403).json({ error: 'User authentication required' });
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;

