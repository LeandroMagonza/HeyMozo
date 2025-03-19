const express = require('express');
const router = express.Router();
const { User, Permission } = require('../models');
const authMiddleware = require('../middleware/auth');
const authService = require('../services/auth');

/**
 * Get all users
 * GET /api/users
 * Admin only
 */
router.get('/', 
  authMiddleware.authenticate, 
  authMiddleware.requireAdmin, 
  async (req, res) => {
    try {
      const users = await User.findAll({
        attributes: ['id', 'email', 'name', 'isAdmin', 'lastLogin', 'createdAt']
      });
      
      return res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Error fetching users' });
    }
  }
);

/**
 * Create a new user
 * POST /api/users
 * Admin only
 */
router.post('/', 
  authMiddleware.authenticate, 
  authMiddleware.requireAdmin, 
  async (req, res) => {
    try {
      const { email, name, isAdmin, permissions } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      
      // Create user
      const user = await User.create({
        email,
        name: name || null,
        isAdmin: isAdmin || false
      });
      
      // Add permissions if provided
      if (permissions && Array.isArray(permissions)) {
        for (const perm of permissions) {
          if (perm.resourceType && perm.resourceId) {
            await Permission.create({
              userId: user.id,
              resourceType: perm.resourceType,
              resourceId: perm.resourceId
            });
          }
        }
      }
      
      return res.status(201).json({
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Error creating user' });
    }
  }
);

/**
 * Update a user
 * PUT /api/users/:userId
 * Admin only
 */
router.put('/:userId', 
  authMiddleware.authenticate, 
  authMiddleware.requireAdmin, 
  async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { name, isAdmin } = req.body;
      
      // Find user
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Update user
      if (name !== undefined) user.name = name;
      if (isAdmin !== undefined) user.isAdmin = isAdmin;
      
      await user.save();
      
      return res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        updatedAt: user.updatedAt
      });
    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ error: 'Error updating user' });
    }
  }
);

/**
 * Delete a user
 * DELETE /api/users/:userId
 * Admin only
 */
router.delete('/:userId', 
  authMiddleware.authenticate, 
  authMiddleware.requireAdmin, 
  async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Find user
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Delete user
      await user.destroy();
      
      return res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ error: 'Error deleting user' });
    }
  }
);

/**
 * Get user permissions
 * GET /api/users/:userId/permissions
 * Admin only
 */
router.get('/:userId/permissions', 
  authMiddleware.authenticate, 
  authMiddleware.requireAdmin, 
  async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Find user
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get permissions
      const permissions = await Permission.findAll({
        where: { userId },
        attributes: ['id', 'resourceType', 'resourceId', 'createdAt']
      });
      
      return res.json(permissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      return res.status(500).json({ error: 'Error fetching permissions' });
    }
  }
);

/**
 * Add a permission for a user
 * POST /api/users/:userId/permissions
 * Admin only
 */
router.post('/:userId/permissions', 
  authMiddleware.authenticate, 
  authMiddleware.requireAdmin, 
  async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { resourceType, resourceId } = req.body;
      
      if (!resourceType || !resourceId) {
        return res.status(400).json({ 
          error: 'Resource type and ID are required' 
        });
      }
      
      // Find user
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Add permission
      const permission = await authService.addPermission(
        userId, 
        resourceType, 
        resourceId
      );
      
      return res.status(201).json({
        id: permission.id,
        userId: permission.userId,
        resourceType: permission.resourceType,
        resourceId: permission.resourceId
      });
    } catch (error) {
      console.error('Error adding permission:', error);
      return res.status(500).json({ error: 'Error adding permission' });
    }
  }
);

/**
 * Remove a permission from a user
 * DELETE /api/users/:userId/permissions
 * Admin only
 */
router.delete('/:userId/permissions', 
  authMiddleware.authenticate, 
  authMiddleware.requireAdmin, 
  async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { resourceType, resourceId } = req.body;
      
      if (!resourceType || !resourceId) {
        return res.status(400).json({ 
          error: 'Resource type and ID are required' 
        });
      }
      
      // Find user
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Remove permission
      const result = await authService.removePermission(
        userId, 
        resourceType, 
        resourceId
      );
      
      if (!result) {
        return res.status(404).json({ 
          error: 'Permission not found' 
        });
      }
      
      return res.json({ 
        message: 'Permission removed successfully' 
      });
    } catch (error) {
      console.error('Error removing permission:', error);
      return res.status(500).json({ error: 'Error removing permission' });
    }
  }
);

module.exports = router; 