const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  createRole,
  getAllRoles,
  getRoleById,
  findUserByEmployeeId,
  assignRoleToUser,
  getUserRoles,
  removeRoleFromUser
} = require('../controllers/role.controller');

function requireAdmin(req, res, next) {
  if (!req.user?.adminId) {
    return res.status(403).json({ error: 'Admin privileges are required for this action' });
  }
  next();
}

/**
 * POST /api/roles
 * Create a new role (Admin only)
 */
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { roleName, description, permissions } = req.body;
    const pool = req.app.locals.pool;

    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const result = await createRole(pool, roleName, description, permissions);
    res.status(201).json(result);
  } catch (error) {
    console.error('Create role error:', error);

    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }

    if (error.message.includes('required') || error.message.includes('must be')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error creating role' });
  }
});

/**
 * GET /api/roles
 * Get all roles
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const pool = req.app.locals.pool;

    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const result = await getAllRoles(pool, includeInactive);
    res.json(result);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Internal server error fetching roles' });
  }
});

/**
 * GET /api/roles/:roleId
 * Get a single role by ID
 */
router.get('/:roleId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const roleId = parseInt(req.params.roleId);
    const pool = req.app.locals.pool;

    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    if (isNaN(roleId)) {
      return res.status(400).json({ error: 'Invalid role ID' });
    }

    const result = await getRoleById(pool, roleId);
    res.json(result);
  } catch (error) {
    console.error('Get role error:', error);

    if (error.message === 'Role not found') {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error fetching role' });
  }
});

/**
 * GET /api/roles/user/employee/:employeeId
 * Find user by employee ID
 */
router.get('/user/employee/:employeeId', authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const pool = req.app.locals.pool;

    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    const result = await findUserByEmployeeId(pool, employeeId);
    res.json(result);
  } catch (error) {
    console.error('Find user by employee ID error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error finding user' });
  }
});

/**
 * POST /api/roles/assign
 * Assign a role to a user (Admin only)
 * Accepts either userId or employeeId
 */
router.post('/assign', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, employeeId, roleId } = req.body;
    const pool = req.app.locals.pool;

    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    if (!roleId) {
      return res.status(400).json({ error: 'Role ID is required' });
    }

    if (!userId && !employeeId) {
      return res.status(400).json({ error: 'Either User ID or Employee ID is required' });
    }

    let finalUserId = userId;

    // If employeeId is provided, find the user by employee ID
    if (employeeId && !userId) {
      const userResult = await findUserByEmployeeId(pool, employeeId);
      finalUserId = userResult.user.id;
    }

    const assignedBy = req.user.adminId;
    const result = await assignRoleToUser(pool, parseInt(finalUserId), parseInt(roleId), assignedBy);
    res.status(201).json(result);
  } catch (error) {
    console.error('Assign role error:', error);

    if (error.message.includes('not found') || error.message.includes('inactive')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error assigning role' });
  }
});

/**
 * GET /api/roles/user/:userId
 * Get all roles assigned to a user
 */
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

    const result = await getUserRoles(pool, userId);
    res.json(result);
  } catch (error) {
    console.error('Get user roles error:', error);

    if (error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error fetching user roles' });
  }
});

/**
 * DELETE /api/roles/assign/:userId/:roleId
 * Remove a role assignment from a user (Admin only)
 */
router.delete('/assign/:userId/:roleId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const roleId = parseInt(req.params.roleId);
    const pool = req.app.locals.pool;

    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    if (isNaN(userId) || isNaN(roleId)) {
      return res.status(400).json({ error: 'Invalid user ID or role ID' });
    }

    const result = await removeRoleFromUser(pool, userId, roleId);
    res.json(result);
  } catch (error) {
    console.error('Remove role error:', error);

    if (error.message === 'Role assignment not found') {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error removing role' });
  }
});

module.exports = router;
