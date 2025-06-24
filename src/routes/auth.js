const express = require('express');
const router = express.Router();
const authService = require('../services/auth');
const authMiddleware = require('../middleware/auth');
const { User, Permission } = require('../models');

// Base URL for the login link
const getLoginBaseUrl = (req) => {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const host = req.get('host');
  return `${protocol}://${host}/login`;
};

/**
 * Request a login link
 * POST /api/auth/login-request
 */
router.post('/login-request', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const loginBaseUrl = getLoginBaseUrl(req);
    const result = await authService.requestLoginToken(email, loginBaseUrl);
    
    return res.json(result);
  } catch (error) {
    console.error('Login request error:', error);
    return res.status(500).json({ error: 'Error processing login request' });
  }
});

/**
 * Verify a login token
 * POST /api/auth/verify-token
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const userData = await authService.verifyLoginToken(token);
    
    // Generate JWT token
    const jwtToken = authMiddleware.generateToken(userData.user);
    
    return res.json({
      ...userData,
      token: jwtToken
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

/**
 * Get current user info
 * GET /api/auth/me
 */
router.get('/me', authMiddleware.authenticate, async (req, res) => {
  try {
    const user = req.user;
    
    // Get permissions
    const permissions = await Permission.findAll({
      where: { userId: user.id }
    });
    
    // Format permissions
    const formattedPermissions = permissions.map(p => ({
      resourceType: p.resourceType,
      resourceId: p.resourceId,
      permissionLevel: p.permissionLevel
    }));
    
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin
      },
      permissions: formattedPermissions
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    return res.status(500).json({ error: 'Error fetching user information' });
  }
});

/**
 * Check if user has access to a specific admin route
 * GET /api/auth/check-access?route=/admin/config
 * GET /api/auth/check-access?route=/admin/1/config
 * GET /api/auth/check-access?route=/admin/1/2/config
 * GET /api/auth/check-access?route=/admin/1/2
 */
router.get('/check-access', authMiddleware.authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { route } = req.query;
    
    if (!route) {
      return res.status(400).json({ error: 'Route parameter is required' });
    }

    // Parse the route to extract components
    const routeParts = route.split('/').filter(part => part !== '');
    
    // Validate route format
    if (routeParts[0] !== 'admin') {
      return res.status(400).json({ error: 'Only admin routes are supported' });
    }

    let hasAccess = false;
    let accessLevel = null;
    let reason = '';

    // Route: /admin/config - Only admins
    if (routeParts.length === 2 && routeParts[1] === 'config') {
      hasAccess = user.isAdmin;
      accessLevel = hasAccess ? 'admin' : null;
      reason = hasAccess ? 'User is admin' : 'Requires admin privileges';
    }
    // Route: /admin/:companyId/config - Edit access to company
    else if (routeParts.length === 3 && routeParts[2] === 'config') {
      const companyId = parseInt(routeParts[1]);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: 'Invalid company ID' });
      }
      
      if (user.isAdmin) {
        hasAccess = true;
        accessLevel = 'admin';
        reason = 'User is admin';
      } else {
        const hasEditAccess = await authService.hasPermission(user.id, 'company', companyId);
        const permission = await Permission.findOne({
          where: { 
            userId: user.id, 
            resourceType: 'company', 
            resourceId: companyId 
          }
        });
        
        hasAccess = hasEditAccess && permission?.permissionLevel === 'edit';
        accessLevel = hasAccess ? 'edit' : null;
        reason = hasAccess ? 'User has edit access to company' : 'Requires edit access to company';
      }
    }
    // Route: /admin/:companyId/:branchId/config - Edit access to company or branch
    else if (routeParts.length === 4 && routeParts[3] === 'config') {
      const companyId = parseInt(routeParts[1]);
      const branchId = parseInt(routeParts[2]);
      
      if (isNaN(companyId) || isNaN(branchId)) {
        return res.status(400).json({ error: 'Invalid company ID or branch ID' });
      }
      
      if (user.isAdmin) {
        hasAccess = true;
        accessLevel = 'admin';
        reason = 'User is admin';
      } else {
        // Check company edit access first
        const companyPermission = await Permission.findOne({
          where: { 
            userId: user.id, 
            resourceType: 'company', 
            resourceId: companyId 
          }
        });
        
        if (companyPermission?.permissionLevel === 'edit') {
          hasAccess = true;
          accessLevel = 'edit';
          reason = 'User has edit access to company';
        } else {
          // Check branch edit access
          const branchPermission = await Permission.findOne({
            where: { 
              userId: user.id, 
              resourceType: 'branch', 
              resourceId: branchId 
            }
          });
          
          hasAccess = branchPermission?.permissionLevel === 'edit';
          accessLevel = hasAccess ? 'edit' : null;
          reason = hasAccess ? 'User has edit access to branch' : 'Requires edit access to company or branch';
        }
      }
    }
    // Route: /admin/:companyId/:branchId - Any access to company or branch
    else if (routeParts.length === 3) {
      const companyId = parseInt(routeParts[1]);
      const branchId = parseInt(routeParts[2]);
      
      if (isNaN(companyId) || isNaN(branchId)) {
        return res.status(400).json({ error: 'Invalid company ID or branch ID' });
      }
      
      if (user.isAdmin) {
        hasAccess = true;
        accessLevel = 'admin';
        reason = 'User is admin';
      } else {
        // Check any access to company
        const companyPermission = await Permission.findOne({
          where: { 
            userId: user.id, 
            resourceType: 'company', 
            resourceId: companyId 
          }
        });
        
        if (companyPermission) {
          hasAccess = true;
          accessLevel = companyPermission.permissionLevel;
          reason = `User has ${companyPermission.permissionLevel} access to company`;
        } else {
          // Check any access to branch
          const branchPermission = await Permission.findOne({
            where: { 
              userId: user.id, 
              resourceType: 'branch', 
              resourceId: branchId 
            }
          });
          
          if (branchPermission) {
            hasAccess = true;
            accessLevel = branchPermission.permissionLevel;
            reason = `User has ${branchPermission.permissionLevel} access to branch`;
          } else {
            hasAccess = false;
            accessLevel = null;
            reason = 'Requires access to company or branch';
          }
        }
      }
    }
    else {
      return res.status(400).json({ error: 'Unsupported route format' });
    }

    return res.json({
      route,
      hasAccess,
      accessLevel,
      reason,
      user: {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });

  } catch (error) {
    console.error('Error checking access:', error);
    return res.status(500).json({ error: 'Error checking access permissions' });
  }
});

module.exports = router;
 