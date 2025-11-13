const { getUserRoles } = require('../controllers/role.controller');
const { getAdminModules } = require('../controllers/module.controller');

/**
 * Middleware to check if user has access to a specific module
 * @param {string} moduleName - Name of the module to check
 * @returns {Function} Express middleware function
 */
function checkModuleAccess(moduleName) {
  return async (req, res, next) => {
    try {
      const pool = req.app.locals.pool;
      if (!pool) {
        return res.status(500).json({ error: 'Database connection not available' });
      }

      // Check if user is admin
      if (req.user && req.user.adminId) {
        const modules = await getAdminModules(pool, req.user.adminId);
        if (modules.modules.includes(moduleName)) {
          return next();
        }
        return res.status(403).json({ error: `Access denied. You don't have permission to access ${moduleName} module.` });
      }

      // Check if user is a regular user with roles
      if (req.user && req.user.userId) {
        const userRoles = await getUserRoles(pool, req.user.userId);
        
        // Check if any role has access to this module
        for (const role of userRoles.roles) {
          if (role.permissions && role.permissions.modules) {
            if (role.permissions.modules.includes(moduleName)) {
              return next();
            }
          }
        }
        
        return res.status(403).json({ error: `Access denied. You don't have permission to access ${moduleName} module.` });
      }

      return res.status(401).json({ error: 'User information not found' });
    } catch (err) {
      console.error('Error checking module access:', err);
      return res.status(500).json({ error: 'Error checking module access' });
    }
  };
}

module.exports = {
  checkModuleAccess
};

