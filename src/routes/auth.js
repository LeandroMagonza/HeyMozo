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
      resourceId: p.resourceId
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

module.exports = router;
 