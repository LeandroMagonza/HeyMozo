const express = require('express');
const router = express.Router();
const authService = require('../services/auth');
const authMiddleware = require('../middleware/auth');
const { User, Permission } = require('../models');

// Health check endpoint - no authentication required
router.get('/health', (req, res) => {
  console.log('🩺 Health check requested');
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    resendConfigured: !!process.env.RESEND_API_KEY,
    emailFrom: process.env.EMAIL_FROM || 'not-configured'
  });
});

// Test database connection
router.get('/test-db', async (req, res) => {
  try {
    console.log('🔍 Testing database connection...');
    const { User, AuthToken } = require('../models');
    
    // Test basic database connection
    await User.sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Test User model
    const userCount = await User.count();
    console.log('👥 Users in database:', userCount);
    
    // Test AuthToken model
    const tokenCount = await AuthToken.count();
    console.log('🎫 Tokens in database:', tokenCount);
    
    res.json({
      status: 'OK',
      database: 'connected',
      userCount,
      tokenCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Database test failed:', error);
    res.status(500).json({
      status: 'ERROR',
      database: 'failed',
      error: error.message,
      stack: error.stack
    });
  }
});

// Simple test POST endpoint to verify routing works
router.post('/test-post', (req, res) => {
  console.log('🧪 Test POST endpoint called');
  console.log('Request body:', req.body);
  console.log('Headers:', req.headers);
  
  res.json({
    status: 'OK',
    message: 'POST endpoint working',
    receivedBody: req.body,
    timestamp: new Date().toISOString()
  });
});

// Base URL for the login link
const getLoginBaseUrl = (req) => {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  
  // In development, use the frontend URL (port 3000)
  if (process.env.NODE_ENV !== 'production') {
    return `${protocol}://localhost:3000/login`;
  }
  
  // In production, use the request host
  const host = req.get('host');
  return `${protocol}://${host}/login`;
};

/**
 * Request a login link
 * POST /api/auth/login-request
 */
router.post('/login-request', async (req, res) => {
  try {
    console.log('=== LOGIN REQUEST DEBUG ===');
    console.log('Request body:', req.body);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('RESEND_API_KEY configured:', !!process.env.RESEND_API_KEY);
    console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
    
    const { email } = req.body;
    
    if (!email) {
      console.log('❌ No email provided');
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('📧 Processing login request for:', email);
    
    const loginBaseUrl = getLoginBaseUrl(req);
    console.log('🔗 Login base URL:', loginBaseUrl);
    
    const result = await authService.requestLoginToken(email, loginBaseUrl);
    console.log('✅ Login token request successful:', result);
    
    return res.json(result);
  } catch (error) {
    console.error('❌ Login request error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    
    // Return more detailed error info for debugging
    return res.status(500).json({ 
      error: 'Error processing login request',
      details: process.env.NODE_ENV === 'production' ? 'Check server logs' : error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
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
 * Logout endpoint (optional - mainly for logging purposes)
 * POST /api/auth/logout
 */
router.post('/logout', authMiddleware.authenticate, async (req, res) => {
  try {
    // In a more complex system, you might want to:
    // 1. Add token to a blacklist
    // 2. Log the logout event
    // 3. Update user's last logout time
    
    const user = req.user;
    
    // Optional: Update user's last logout time
    if (user) {
      user.lastLogout = new Date();
      await user.save();
    }
    
    return res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Error during logout' });
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
    // Route: /admin/:companyId/:branchId/urls - Edit access to company or branch (same as config)
    else if (routeParts.length === 4 && routeParts[3] === 'urls') {
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
 