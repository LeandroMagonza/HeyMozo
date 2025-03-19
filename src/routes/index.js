const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const userRoutes = require('./users');
const authMiddleware = require('../middleware/auth');
const { Op } = require('sequelize');

// Import models
const { 
  Company, 
  Branch, 
  Table, 
  Event,
  Permission
} = require('../models');

// Auth routes
router.use('/auth', authRoutes);

// User management routes
router.use('/users', userRoutes);

// Apply authentication middleware to protected routes
router.use('/companies', authMiddleware.authenticate);
router.use('/branches', authMiddleware.authenticate);
router.use('/tables', authMiddleware.authenticate);

// Companies routes with permission check
router.get('/companies', async (req, res) => {
  try {
    // Admin users can see all companies
    if (req.user.isAdmin) {
      const companies = await Company.findAll();
      return res.json(companies);
    }
    
    // Regular users can only see companies they have permissions for
    const permissions = await Permission.findAll({
      where: { 
        userId: req.user.id,
        resourceType: 'company'
      }
    });
    
    const companyIds = permissions.map(p => p.resourceId);
    const companies = await Company.findAll({
      where: {
        id: { [Op.in]: companyIds }
      }
    });
    
    return res.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return res.status(500).json({ error: 'Error fetching companies' });
  }
});

// Add other routes similar to above with permission checks...

module.exports = router; 