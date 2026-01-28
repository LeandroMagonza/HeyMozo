const jwt = require('jsonwebtoken');
const { User } = require('../models');
const authService = require('../services/auth');
const { ResourceTypes, VALID_RESOURCE_TYPES } = require('../constants');

// Secret for JWT, should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = '7d'; // Token valid for 7 days

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object
 * @returns {string} - JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, isAdmin: user.isAdmin },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

/**
 * Middleware to authenticate requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = async (req, res, next) => {
  console.log('🔐 AUTH MIDDLEWARE - Path:', req.method, req.path);

  // Get the token from the Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ AUTH MIDDLEWARE - No valid authorization header');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Find the user
    const user = await User.findByPk(decoded.id);
    if (!user) {
      console.log('❌ AUTH MIDDLEWARE - User not found');
      return res.status(401).json({ error: 'User not found' });
    }

    console.log('✅ AUTH MIDDLEWARE - User authenticated:', user.email);
    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ AUTH MIDDLEWARE - Authentication error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware to check if user is an admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Middleware to check permission for a company
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const checkCompanyPermission = async (req, res, next) => {
  const companyId = parseInt(req.params.companyId || req.body.companyId || req.query.companyId);
  
  if (!companyId) {
    return next(); // No company ID specified, skip check
  }

  try {
    // Admin users bypass permission check
    if (req.user.isAdmin) {
      return next();
    }

    const hasAccess = await authService.hasPermission(
      req.user.id,
      'company',
      companyId
    );

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this company' });
    }

    next();
  } catch (error) {
    console.error('Permission check error:', error);
    res.status(500).json({ error: 'Error checking permissions' });
  }
};

/**
 * Middleware to check permission for a branch
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const checkBranchPermission = async (req, res, next) => {
  const branchId = parseInt(req.params.branchId || req.body.branchId || req.query.branchId);
  
  if (!branchId) {
    return next(); // No branch ID specified, skip check
  }

  try {
    // Admin users bypass permission check
    if (req.user.isAdmin) {
      return next();
    }

    const hasAccess = await authService.hasPermission(
      req.user.id,
      'branch',
      branchId
    );

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this branch' });
    }

    next();
  } catch (error) {
    console.error('Permission check error:', error);
    res.status(500).json({ error: 'Error checking permissions' });
  }
};

/**
 * Middleware to check permission for a table
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const checkTablePermission = async (req, res, next) => {
  const tableId = parseInt(req.params.tableId || req.body.tableId || req.query.tableId);
  
  if (!tableId) {
    return next(); // No table ID specified, skip check
  }

  try {
    // Admin users bypass permission check
    if (req.user.isAdmin) {
      return next();
    }

    const hasAccess = await authService.hasPermission(
      req.user.id,
      'table',
      tableId
    );

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this table' });
    }

    next();
  } catch (error) {
    console.error('Permission check error:', error);
    res.status(500).json({ error: 'Error checking permissions' });
  }
};

/**
 * Generic middleware to check permission for any resource type
 * Reduces code duplication across routes
 * @param {Object} options - Configuration options
 * @param {string} options.resourceTypeParam - Name of the param containing resource type (default: 'resourceType')
 * @param {string} options.resourceIdParam - Name of the param containing resource ID (default: 'resourceId')
 * @returns {Function} Express middleware
 */
const checkResourcePermission = (options = {}) => {
  const {
    resourceTypeParam = 'resourceType',
    resourceIdParam = 'resourceId'
  } = options;

  return async (req, res, next) => {
    const resourceType = req.params[resourceTypeParam];
    const resourceId = parseInt(req.params[resourceIdParam]);

    // Validate resource type
    if (!VALID_RESOURCE_TYPES.includes(resourceType)) {
      return res.status(400).json({ error: 'Invalid resource type' });
    }

    // Validate resource ID
    if (isNaN(resourceId) || resourceId <= 0) {
      return res.status(400).json({ error: 'Invalid resource ID' });
    }

    try {
      // Admin users bypass permission check
      if (req.user.isAdmin) {
        return next();
      }

      // Map resource type to permission type
      const permissionTypeMap = {
        [ResourceTypes.COMPANY]: 'company',
        [ResourceTypes.BRANCH]: 'branch',
        [ResourceTypes.LOCATION]: 'table'
      };

      const permissionType = permissionTypeMap[resourceType];
      const hasAccess = await authService.hasPermission(
        req.user.id,
        permissionType,
        resourceId
      );

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this resource' });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Error checking permissions' });
    }
  };
};

/**
 * Helper to safely parse integer IDs
 * Returns null if invalid
 * @param {string|number} value - Value to parse
 * @returns {number|null}
 */
const parseResourceId = (value) => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed <= 0 ? null : parsed;
};

module.exports = {
  generateToken,
  authenticate,
  requireAdmin,
  checkCompanyPermission,
  checkBranchPermission,
  checkTablePermission,
  checkResourcePermission,
  parseResourceId
}; 