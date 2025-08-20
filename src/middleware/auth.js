const jwt = require('jsonwebtoken');
const { User } = require('../models');
const authService = require('../services/auth');

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
  // Get the token from the Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find the user
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
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

module.exports = {
  generateToken,
  authenticate,
  requireAdmin,
  checkCompanyPermission,
  checkBranchPermission,
  checkTablePermission
}; 