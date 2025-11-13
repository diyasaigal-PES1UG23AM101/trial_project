const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getUserModules, getAdminModules } = require('../controllers/module.controller');

// Get accessible modules for current user (admin)
router.get('/admin', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const adminId = req.user.adminId;
    if (!adminId) {
      return res.status(400).json({ error: 'Admin ID not found in token' });
    }

    const result = await getAdminModules(pool, adminId);
    res.json(result);
  } catch (error) {
    if (error.message === 'Admin not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error fetching admin modules' });
  }
});

// Get accessible modules for a user
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const pool = req.app.locals.pool;

    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const result = await getUserModules(pool, userId);
    res.json(result);
  } catch (error) {
    if (error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error fetching user modules' });
  }
});

module.exports = router;

