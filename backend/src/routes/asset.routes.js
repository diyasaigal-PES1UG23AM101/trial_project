const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getEmployeeAssets, getAllAssets, createAsset, assignAssetToEmployee, getAssetsForUser } = require('../controllers/asset.controller');

// Get assets assigned to current employee (web app uses this path)
router.get('/my-assets', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    if (!req.user?.userId) {
      return res.status(400).json({ error: 'User ID not found in token' });
    }

    const result = await getEmployeeAssets(pool, req.user.userId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching employee assets:', error);
    if (error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error fetching employee assets' });
  }
});

// Get assets for current user (used by dashboard endpoint)
router.get('/my', authenticateToken, async (req, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(403).json({ error: 'User authentication required' });
    }

    const pool = req.app.locals.pool;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const result = await getAssetsForUser(pool, {
      userId: req.user.userId,
      fullName: req.user.fullName,
      username: req.user.username
    });

    res.json(result);
  } catch (error) {
    console.error('Get assets for user error:', error);
    res.status(500).json({ error: 'Failed to load assigned assets' });
  }
});

// Get all assets (admin/IT staff only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const result = await getAllAssets(pool);
    res.json(result);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Error fetching assets' });
  }
});

// Create new asset (admin/IT staff only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { assetName, assetType, serialNumber, manufacturer, model, status, location, description } = req.body;
    const pool = req.app.locals.pool;

    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    if (!assetName || !assetType) {
      return res.status(400).json({ error: 'Asset name and type are required' });
    }

    const result = await createAsset(pool, {
      assetName,
      assetType,
      serialNumber,
      manufacturer,
      model,
      status,
      location,
      description
    });
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating asset:', error);
    if (error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error creating asset' });
  }
});

// Assign asset to employee (admin/IT staff only)
router.post('/assign', authenticateToken, async (req, res) => {
  try {
    const { assetId, userId, notes } = req.body;
    const pool = req.app.locals.pool;

    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    if (!assetId || !userId) {
      return res.status(400).json({ error: 'Asset ID and User ID are required' });
    }

    const assignedBy = req.user.adminId || req.user.userId;
    const result = await assignAssetToEmployee(pool, parseInt(assetId, 10), parseInt(userId, 10), assignedBy, notes);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error assigning asset:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error assigning asset' });
  }
});

module.exports = router;

