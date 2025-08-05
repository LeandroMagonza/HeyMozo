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

// Auth routes are mounted directly in server.js, not here
// router.use('/auth', authRoutes);

// User management routes
router.use('/users', userRoutes);

// Apply authentication middleware to protected routes
router.use('/companies', authMiddleware.authenticate);
router.use('/branches', authMiddleware.authenticate);
router.use('/tables', authMiddleware.authenticate);

// Specific company routes
router.get('/companies/:companyId', authMiddleware.checkCompanyPermission, async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ error: 'Error fetching company' });
  }
});

router.put('/companies/:companyId', authMiddleware.checkCompanyPermission, async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    await company.update(req.body);
    res.json(company);
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ error: 'Error updating company' });
  }
});

// Branches routes with permission check
router.get('/branches', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (companyId) {
      // Check permission for specific company
      if (!req.user.isAdmin) {
        const authService = require('../services/auth');
        const hasAccess = await authService.hasPermission(req.user.id, 'company', parseInt(companyId));
        if (!hasAccess) {
          return res.status(403).json({ error: 'Access denied to this company' });
        }
      }
      
      const branches = await Branch.findAll({
        where: { companyId: parseInt(companyId) },
        include: [{
          model: Table,
          attributes: ['id']
        }]
      });
      
      // Format the response to include tableIds like the old format
      const formattedBranches = branches.map(branch => ({
        ...branch.toJSON(),
        tableIds: branch.Tables.map(table => table.id)
      }));
      
      return res.json(formattedBranches);
    }
    
    // Return all branches user has access to
    if (req.user.isAdmin) {
      const branches = await Branch.findAll({
        include: [{
          model: Table,
          attributes: ['id']
        }]
      });
      
      // Format the response to include tableIds like the old format
      const formattedBranches = branches.map(branch => ({
        ...branch.toJSON(),
        tableIds: branch.Tables.map(table => table.id)
      }));
      
      return res.json(formattedBranches);
    }
    
    const permissions = await Permission.findAll({
      where: { 
        userId: req.user.id,
        resourceType: { [Op.in]: ['company', 'branch'] }
      }
    });
    
    const companyIds = permissions
      .filter(p => p.resourceType === 'company')
      .map(p => p.resourceId);
    const branchIds = permissions
      .filter(p => p.resourceType === 'branch')
      .map(p => p.resourceId);
    
    const branches = await Branch.findAll({
      where: {
        [Op.or]: [
          { companyId: { [Op.in]: companyIds } },
          { id: { [Op.in]: branchIds } }
        ]
      },
      include: [{
        model: Table,
        attributes: ['id']
      }]
    });
    
    // Format the response to include tableIds like the old format
    const formattedBranches = branches.map(branch => ({
      ...branch.toJSON(),
      tableIds: branch.Tables.map(table => table.id)
    }));
    
    res.json(formattedBranches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ error: 'Error fetching branches' });
  }
});

router.get('/branches/:branchId', authMiddleware.checkBranchPermission, async (req, res) => {
  try {
    const branch = await Branch.findByPk(req.params.branchId, {
      include: [{
        model: Table,
        attributes: ['id']
      }]
    });
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    
    // Format the response to include tableIds like the old format
    const formattedBranch = {
      ...branch.toJSON(),
      tableIds: branch.Tables.map(table => table.id)
    };
    
    res.json(formattedBranch);
  } catch (error) {
    console.error('Error fetching branch:', error);
    res.status(500).json({ error: 'Error fetching branch' });
  }
});

router.put('/branches/:branchId', authMiddleware.checkBranchPermission, async (req, res) => {
  try {
    const branch = await Branch.findByPk(req.params.branchId);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    
    await branch.update(req.body);
    res.json(branch);
  } catch (error) {
    console.error('Error updating branch:', error);
    res.status(500).json({ error: 'Error updating branch' });
  }
});

// Tables routes with permission check  
router.get('/tables', async (req, res) => {
  try {
    const { branchId } = req.query;
    
    if (branchId) {
      // Check permission for specific branch
      if (!req.user.isAdmin) {
        const authService = require('../services/auth');
        const hasAccess = await authService.hasPermission(req.user.id, 'branch', parseInt(branchId));
        if (!hasAccess) {
          return res.status(403).json({ error: 'Access denied to this branch' });
        }
      }
      
      const tables = await Table.findAll({
        where: { branchId: parseInt(branchId) },
        include: [{
          model: Event,
          as: 'events'
        }],
        order: [['events', 'createdAt', 'DESC']]
      });
      return res.json(tables);
    }
    
    // Return all tables user has access to
    if (req.user.isAdmin) {
      const tables = await Table.findAll({
        include: [{
          model: Event,
          as: 'events'
        }],
        order: [['events', 'createdAt', 'DESC']]
      });
      return res.json(tables);
    }
    
    // For regular users, need to find accessible branches first
    const permissions = await Permission.findAll({
      where: { 
        userId: req.user.id,
        resourceType: { [Op.in]: ['company', 'branch', 'table'] }
      }
    });
    
    // Get all accessible branch IDs
    const companyIds = permissions
      .filter(p => p.resourceType === 'company')
      .map(p => p.resourceId);
    const branchIds = permissions
      .filter(p => p.resourceType === 'branch')
      .map(p => p.resourceId);
    const tableIds = permissions
      .filter(p => p.resourceType === 'table')
      .map(p => p.resourceId);
    
    // Get branches from companies
    if (companyIds.length > 0) {
      const companyBranches = await Branch.findAll({
        where: { companyId: { [Op.in]: companyIds } }
      });
      branchIds.push(...companyBranches.map(b => b.id));
    }
    
    const tables = await Table.findAll({
      where: {
        [Op.or]: [
          { branchId: { [Op.in]: branchIds } },
          { id: { [Op.in]: tableIds } }
        ]
      },
      include: [{
        model: Event,
        as: 'events'
      }],
      order: [['events', 'createdAt', 'DESC']]
    });
    
    res.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Error fetching tables' });
  }
});

router.get('/tables/:tableId', authMiddleware.checkTablePermission, async (req, res) => {
  try {
    const table = await Table.findByPk(req.params.tableId, {
      include: [{
        model: Event,
        as: 'events'
      }],
      order: [['events', 'createdAt', 'DESC']]
    });
    
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    res.json(table);
  } catch (error) {
    console.error('Error fetching table:', error);
    res.status(500).json({ error: 'Error fetching table' });
  }
});

router.put('/tables/:tableId', authMiddleware.checkTablePermission, async (req, res) => {
  try {
    const table = await Table.findByPk(req.params.tableId);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    await table.update(req.body);
    
    // Fetch updated table with events
    const updatedTable = await Table.findByPk(req.params.tableId, {
      include: [{
        model: Event,
        as: 'events'
      }],
      order: [['events', 'createdAt', 'DESC']]
    });
    
    res.json(updatedTable);
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({ error: 'Error updating table' });
  }
});

// POST route to create a new table
router.post('/tables', async (req, res) => {
  try {
    const { branchId } = req.body;
    
    if (branchId) {
      // Check permission for specific branch
      if (!req.user.isAdmin) {
        const authService = require('../services/auth');
        const hasAccess = await authService.hasPermission(req.user.id, 'branch', parseInt(branchId));
        if (!hasAccess) {
          return res.status(403).json({ error: 'Access denied to this branch' });
        }
      }
    }
    
    const table = await Table.create(req.body);
    
    // Si hay eventos iniciales, crearlos
    if (req.body.events && req.body.events.length > 0) {
      await Event.bulkCreate(
        req.body.events.map(event => ({
          ...event,
          tableId: table.id
        }))
      );
    }

    // Devolver la mesa con sus eventos
    const tableWithEvents = await Table.findByPk(table.id, {
      include: [{
        model: Event,
        as: 'events'
      }],
      order: [['events', 'createdAt', 'DESC']]
    });

    res.status(201).json(tableWithEvents);
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ error: 'Error creating table' });
  }
});

// DELETE route to soft delete a table
router.delete('/tables/:tableId', authMiddleware.checkTablePermission, async (req, res) => {
  try {
    const tableId = req.params.tableId;
    
    // Verify table exists
    const table = await Table.findByPk(tableId);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Soft delete the table (events are kept for historical purposes)
    await table.destroy();
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ error: 'Error deleting table' });
  }
});

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

// POST route to create a new company
router.post('/companies', authMiddleware.authenticate, async (req, res) => {
  try {
    const company = await Company.create(req.body);
    
    // Create permission for the user who created the company
    await Permission.create({
      userId: req.user.id,
      resourceType: 'company',
      resourceId: company.id,
      permissionLevel: 'edit' // Full access to the company they created
    });
    
    res.status(201).json(company);
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ error: 'Error creating company' });
  }
});

// POST route to create a new branch
router.post('/branches', async (req, res) => {
  try {
    const { companyId } = req.body;
    
    if (companyId) {
      // Check permission for specific company
      if (!req.user.isAdmin) {
        const authService = require('../services/auth');
        const hasAccess = await authService.hasPermission(req.user.id, 'company', parseInt(companyId));
        if (!hasAccess) {
          return res.status(403).json({ error: 'Access denied to this company' });
        }
      }
    }
    
    const branch = await Branch.create(req.body);
    res.status(201).json(branch);
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ error: 'Error creating branch' });
  }
});

// DELETE route to soft delete a company
router.delete('/companies/:companyId', authMiddleware.checkCompanyPermission, async (req, res) => {
  try {
    const companyId = req.params.companyId;
    
    // Verify company exists
    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Only soft delete the company - branches and tables remain but become invisible through joins
    await company.destroy();
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ error: 'Error deleting company' });
  }
});

// DELETE route to soft delete a branch
router.delete('/branches/:branchId', authMiddleware.checkBranchPermission, async (req, res) => {
  try {
    const branchId = req.params.branchId;
    
    // Verify branch exists
    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    // Only soft delete the branch - tables remain but become invisible through joins
    await branch.destroy();
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting branch:', error);
    res.status(500).json({ error: 'Error deleting branch' });
  }
});

module.exports = router; 