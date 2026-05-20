/**
 * Role-Based Access Control Middleware
 * Check if user has required role to access a route
 */

const ROLE_HIERARCHY = {
  admin: 4,
  architect: 3,
  developer: 2,
  viewer: 1,
};

/**
 * Require specific roles to access a route
 * @param  {...string} allowedRoles - Roles that can access this route
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
}

/**
 * Require minimum role level (using hierarchy)
 * @param {string} minRole - Minimum role required
 */
function requireMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: minRole,
        current: req.user.role,
      });
    }

    next();
  };
}

module.exports = { requireRole, requireMinRole, ROLE_HIERARCHY };
