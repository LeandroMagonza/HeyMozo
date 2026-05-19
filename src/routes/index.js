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
  EventType,
  Permission,
  Category,
  MenuItem
} = require('../models');

// Auth routes are mounted directly in server.js, not here
// router.use('/auth', authRoutes);

// User management routes
router.use('/users', userRoutes);

// Apply authentication middleware to protected routes
router.use('/companies', authMiddleware.authenticate);
router.use('/branches', authMiddleware.authenticate);
router.use('/tables', authMiddleware.authenticate);
router.use('/categories', authMiddleware.authenticate);

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

// POST /api/branches/:branchId/release-all-tables - Release all tables in a branch
router.post('/branches/:branchId/release-all-tables', authMiddleware.checkBranchPermission, async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);

    // Get all tables in the branch
    const tables = await Table.findAll({
      where: { branchId },
      include: [{ model: Event, as: 'events' }]
    });

    if (!tables || tables.length === 0) {
      return res.status(404).json({ error: 'No tables found for this branch' });
    }

    // Get company ID for event types
    const branch = await Branch.findByPk(branchId, {
      include: [{ model: Company }]
    });

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    const companyId = branch.Company.id;

    // Find VACATE event type
    const vacateEventType = await EventType.findOne({
      where: {
        companyId,
        systemEventType: 'VACATE',
        isActive: true
      }
    });

    if (!vacateEventType) {
      return res.status(500).json({ error: 'VACATE event type not found' });
    }

    const now = new Date();

    // Process each table
    for (const table of tables) {
      // Mark all existing events as seen
      await Event.update(
        { seenAt: now },
        { where: { tableId: table.id, seenAt: null } }
      );

      // Create VACATE event to mark table as available
      await Event.create({
        tableId: table.id,
        eventTypeId: vacateEventType.id,
        message: null,
        createdAt: now,
        seenAt: now,
        userId: req.user.id
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error releasing all tables:', error);
    res.status(500).json({ error: 'Error releasing all tables' });
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
          as: 'events',
          include: [{
            model: require('../models').EventType,
            as: 'eventType',
            attributes: ['id', 'eventName', 'stateName', 'userColor', 'userFontColor', 'userIcon', 'adminColor', 'priority', 'systemEventType']
          }]
        }],
        order: [['events', 'createdAt', 'DESC']]
      });

      // Get available event types for the branch/company
      const EventConfigService = require('../services/eventConfig');
      const tablesWithEventTypes = await Promise.all(tables.map(async (table) => {
        try {
          const availableEventTypes = await EventConfigService.getAdminEventsForTable(table.id);
          return {
            ...table.toJSON(),
            availableEventTypes
          };
        } catch (error) {
          console.error(`Error getting event types for table ${table.id}:`, error);
          return {
            ...table.toJSON(),
            availableEventTypes: []
          };
        }
      }));

      return res.json(tablesWithEventTypes);
    }
    
    // Return all tables user has access to
    if (req.user.isAdmin) {
      const tables = await Table.findAll({
        include: [{
          model: Event,
          as: 'events',
          include: [{
            model: require('../models').EventType,
            as: 'eventType',
            attributes: ['id', 'eventName', 'stateName', 'userColor', 'userFontColor', 'userIcon', 'adminColor', 'priority', 'systemEventType']
          }]
        }],
        order: [['events', 'createdAt', 'DESC']]
      });

      // Get available event types for each table
      const EventConfigService = require('../services/eventConfig');
      const tablesWithEventTypes = await Promise.all(tables.map(async (table) => {
        try {
          const availableEventTypes = await EventConfigService.getAdminEventsForTable(table.id);
          return {
            ...table.toJSON(),
            availableEventTypes
          };
        } catch (error) {
          console.error(`Error getting event types for table ${table.id}:`, error);
          return {
            ...table.toJSON(),
            availableEventTypes: []
          };
        }
      }));

      return res.json(tablesWithEventTypes);
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
        as: 'events',
        include: [{
          model: require('../models').EventType,
          as: 'eventType',
          attributes: ['id', 'eventName', 'stateName', 'userColor', 'adminColor', 'priority', 'systemEventType']
        }]
      }],
      order: [['events', 'createdAt', 'DESC']]
    });

    // Get available event types for each table
    const EventConfigService = require('../services/eventConfig');
    const tablesWithEventTypes = await Promise.all(tables.map(async (table) => {
      try {
        const availableEventTypes = await EventConfigService.getAdminEventsForTable(table.id);
        return {
          ...table.toJSON(),
          availableEventTypes
        };
      } catch (error) {
        console.error(`Error getting event types for table ${table.id}:`, error);
        return {
          ...table.toJSON(),
          availableEventTypes: []
        };
      }
    }));
    
    res.json(tablesWithEventTypes);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Error fetching tables' });
  }
});

router.get('/tables/:tableId', authMiddleware.checkTablePermission, async (req, res) => {
  console.log('🚨🚨🚨 TABLE ENDPOINT HIT FOR TABLE:', req.params.tableId);
  try {
    const table = await Table.findByPk(req.params.tableId, {
      include: [{
        model: Event,
        as: 'events',
        include: [{
          model: require('../models').EventType,
          as: 'eventType',
          attributes: ['id', 'eventName', 'stateName', 'userColor', 'adminColor', 'priority', 'systemEventType']
        }]
      }],
      order: [['events', 'createdAt', 'DESC']]
    });
    
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Get available event types for this table
    const EventConfigService = require('../services/eventConfig');
    try {
      // Use customer events for UserScreen (excludes system events and applies hierarchy correctly).
      // Shape: { quickActions, mainActions, all } — see EventConfigService.getCustomerEventsForTable.
      const availableEventTypes = await EventConfigService.getCustomerEventsForTable(table.id);
      console.log(
        '🎯 availableEventTypes:',
        availableEventTypes.quickActions.length,
        'quick,',
        availableEventTypes.mainActions.length,
        'main'
      );
      
      // Get all events (including system events) to find SCAN event for UserScreen
      // First get the company ID from the table
      const { Branch, Company } = require('../models');
      const tableWithBranch = await Table.findByPk(table.id, {
        include: [{
          model: Branch,
          include: [{ model: Company }]
        }]
      });
      const companyId = tableWithBranch.Branch.Company.id;
      
      const allEvents = await EventConfigService.getAllEventsWithConfiguration(
        'location',
        table.id,
        companyId,
        tableWithBranch.Branch.id,
        true // Include system events
      );
      
      // Get scan event configuration for UserScreen
      const scanEvent = allEvents.find(event => 
        event.systemEventType === 'SCAN'
      );
      const scanEventConfig = scanEvent ? {
        eventName: scanEvent.eventName || 'Página Escaneada',
        eventColor: scanEvent.userColor || '#28a745',
        fontColor: scanEvent.userFontColor || '#ffffff'
      } : null;
      
      const tableWithEventTypes = {
        ...table.toJSON(),
        availableEventTypes,
        scanEvent: scanEventConfig
      };
      res.json(tableWithEventTypes);
    } catch (error) {
      console.error(`Error getting event types for table ${table.id}:`, error);
      res.json({
        ...table.toJSON(),
        availableEventTypes: [],
        scanEvent: null
      });
    }
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
    
    // Fetch updated table with events and event types
    const updatedTable = await Table.findByPk(req.params.tableId, {
      include: [{
        model: Event,
        as: 'events',
        include: [{
          model: require('../models').EventType,
          as: 'eventType',
          attributes: ['id', 'eventName', 'stateName', 'userColor', 'adminColor', 'priority', 'systemEventType']
        }]
      }],
      order: [['events', 'createdAt', 'DESC']]
    });

    // Get available event types for this table
    const EventConfigService = require('../services/eventConfig');
    try {
      const availableEventTypes = await EventConfigService.getAdminEventsForTable(updatedTable.id);
      const tableWithEventTypes = {
        ...updatedTable.toJSON(),
        availableEventTypes
      };
      res.json(tableWithEventTypes);
    } catch (error) {
      console.error(`Error getting event types for table ${updatedTable.id}:`, error);
      res.json({
        ...updatedTable.toJSON(),
        availableEventTypes: []
      });
    }
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({ error: 'Error updating table' });
  }
});

// POST route to create a new table
router.post('/tables', async (req, res) => {
  const logger = require('../utils/logger');
  
  try {
    const { branchId } = req.body;
    logger.request('POST', '/api/tables', req.user);
    
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
    logger.info(`Table created successfully`, { id: table.id, branchId });
    
    // Create initial VACATE event to mark table as unoccupied
    const { EventType } = require('../models');
    const vacateEventType = await EventType.findOne({
      where: { 
        systemEventType: 'VACATE',
        companyId: branchId ? 
          (await require('../models').Branch.findByPk(branchId))?.companyId : 
          req.body.companyId
      }
    });
    
    if (vacateEventType) {
      await Event.create({
        tableId: table.id,
        eventTypeId: vacateEventType.id,
        type: 'VACATE', // Legacy support
        message: null
      });
      logger.info(`Created initial VACATE event for table ${table.id}`);
    } else {
      logger.warn(`No VACATE event type found for table ${table.id}`);
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
    const logger = require('../utils/logger');
    logger.error('Failed to create table', error);
    
    // Send more specific error messages
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors.map(e => e.message) 
      });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ 
        error: 'Table with this identifier already exists' 
      });
    }
    
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
    
    // Create default event types for the new company
    const EventConfigService = require('../services/eventConfig');
    await EventConfigService.createDefaultEventTypes(company.id, req.user.id);
    
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

// ============================================================
// Sprint 2.2 — Menu endpoints
// ============================================================

// Fields in MenuItem hidden from UI in MVP (reserved for Fase 3 delivery).
const MENU_ITEM_HIDDEN_FIELDS = ['stock', 'metaProductId'];

// Resolve branchId for a category (used for permission checks on /categories routes).
async function getBranchIdForCategory(categoryId) {
  const cat = await Category.findByPk(categoryId, { attributes: ['branchId'] });
  return cat ? cat.branchId : null;
}

// Check branch permission inline for routes where branchId is not a URL param.
async function hasBranchAccess(user, branchId) {
  if (user.isAdmin) return true;
  const authService = require('../services/auth');
  return authService.hasPermission(user.id, 'branch', branchId);
}

// --- Categories ---

// GET /api/branches/:branchId/categories — list with nested items
router.get('/branches/:branchId/categories', authMiddleware.checkBranchPermission, async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { branchId: req.params.branchId },
      order: [['displayOrder', 'ASC'], ['name', 'ASC']],
      include: [{
        model: MenuItem,
        as: 'items',
        attributes: { exclude: MENU_ITEM_HIDDEN_FIELDS },
        required: false,
        order: [['displayOrder', 'ASC'], ['name', 'ASC']]
      }]
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Error fetching categories' });
  }
});

// POST /api/branches/:branchId/categories — create category
router.post('/branches/:branchId/categories', authMiddleware.checkBranchPermission, async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const { name, displayOrder, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name es requerido' });
    }

    const category = await Category.create({ branchId, name, displayOrder, isActive });
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Error creating category' });
  }
});

// PUT /api/branches/:branchId/categories/reorder — bulk reorder (must be before /:categoryId)
router.put('/branches/:branchId/categories/reorder', authMiddleware.checkBranchPermission, async (req, res) => {
  try {
    const { order } = req.body; // [{ id, displayOrder }]

    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'order debe ser un array de {id, displayOrder}' });
    }

    await Promise.all(
      order.map(({ id, displayOrder }) =>
        Category.update({ displayOrder }, { where: { id, branchId: req.params.branchId } })
      )
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering categories:', error);
    res.status(500).json({ error: 'Error reordering categories' });
  }
});

// PUT /api/branches/:branchId/categories/:categoryId — update category
router.put('/branches/:branchId/categories/:categoryId', authMiddleware.checkBranchPermission, async (req, res) => {
  try {
    const category = await Category.findOne({
      where: { id: req.params.categoryId, branchId: req.params.branchId }
    });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const { name, displayOrder, isActive } = req.body;
    await category.update({ name, displayOrder, isActive });
    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Error updating category' });
  }
});

// DELETE /api/branches/:branchId/categories/:categoryId — soft delete
router.delete('/branches/:branchId/categories/:categoryId', authMiddleware.checkBranchPermission, async (req, res) => {
  try {
    const category = await Category.findOne({
      where: { id: req.params.categoryId, branchId: req.params.branchId }
    });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await category.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Error deleting category' });
  }
});

// --- Menu Items ---

// GET /api/categories/:categoryId/items — list items for a category
router.get('/categories/:categoryId/items', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    const branchId = await getBranchIdForCategory(categoryId);

    if (!branchId) {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (!await hasBranchAccess(req.user, branchId)) {
      return res.status(403).json({ error: 'Access denied to this branch' });
    }

    const items = await MenuItem.findAll({
      where: { categoryId },
      attributes: { exclude: MENU_ITEM_HIDDEN_FIELDS },
      order: [['displayOrder', 'ASC'], ['name', 'ASC']]
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Error fetching menu items' });
  }
});

// POST /api/categories/:categoryId/items — create item
router.post('/categories/:categoryId/items', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    const branchId = await getBranchIdForCategory(categoryId);

    if (!branchId) {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (!await hasBranchAccess(req.user, branchId)) {
      return res.status(403).json({ error: 'Access denied to this branch' });
    }

    const { name, description, priceCents, imageUrl, isAvailable, displayOrder } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name es requerido' });
    }
    if (priceCents === undefined || priceCents === null) {
      return res.status(400).json({ error: 'priceCents es requerido' });
    }

    const item = await MenuItem.create({ categoryId, name, description, priceCents, imageUrl, isAvailable, displayOrder });
    const created = item.toJSON();
    MENU_ITEM_HIDDEN_FIELDS.forEach(f => delete created[f]);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Error creating menu item' });
  }
});

// PUT /api/categories/:categoryId/items/reorder — bulk reorder (must be before /:itemId)
router.put('/categories/:categoryId/items/reorder', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    const branchId = await getBranchIdForCategory(categoryId);

    if (!branchId) {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (!await hasBranchAccess(req.user, branchId)) {
      return res.status(403).json({ error: 'Access denied to this branch' });
    }

    const { order } = req.body; // [{ id, displayOrder }]

    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'order debe ser un array de {id, displayOrder}' });
    }

    await Promise.all(
      order.map(({ id, displayOrder }) =>
        MenuItem.update({ displayOrder }, { where: { id, categoryId } })
      )
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering menu items:', error);
    res.status(500).json({ error: 'Error reordering menu items' });
  }
});

// PUT /api/categories/:categoryId/items/:itemId — update item
router.put('/categories/:categoryId/items/:itemId', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    const branchId = await getBranchIdForCategory(categoryId);

    if (!branchId) {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (!await hasBranchAccess(req.user, branchId)) {
      return res.status(403).json({ error: 'Access denied to this branch' });
    }

    const item = await MenuItem.findOne({
      where: { id: req.params.itemId, categoryId }
    });
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const { name, description, priceCents, imageUrl, isAvailable, displayOrder } = req.body;
    await item.update({ name, description, priceCents, imageUrl, isAvailable, displayOrder });

    const updated = item.toJSON();
    MENU_ITEM_HIDDEN_FIELDS.forEach(f => delete updated[f]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Error updating menu item' });
  }
});

// DELETE /api/categories/:categoryId/items/:itemId — soft delete
router.delete('/categories/:categoryId/items/:itemId', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    const branchId = await getBranchIdForCategory(categoryId);

    if (!branchId) {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (!await hasBranchAccess(req.user, branchId)) {
      return res.status(403).json({ error: 'Access denied to this branch' });
    }

    const item = await MenuItem.findOne({
      where: { id: req.params.itemId, categoryId }
    });
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    await item.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Error deleting menu item' });
  }
});

// ============================================================
// Sprint 3.2 — Staff order endpoints (autenticados)
// ============================================================

const orderService = require('../services/orders');

// GET /api/branches/:branchId/orders/active — lista pedidos pending de la
// sucursal para alimentar las AlertCards purple del piso (OpShell).
router.get('/branches/:branchId/orders/active', authMiddleware.checkBranchPermission, async (req, res) => {
  try {
    const orders = await orderService.listActiveOrders({ branchId: parseInt(req.params.branchId) });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching active orders:', error);
    res.status(500).json({ error: 'Error fetching active orders' });
  }
});

// POST /api/orders/staff — staff carga un pedido en persona desde OpShell.
// Crea Order con createdByDeviceId=null y createdByUserId=req.user.id.
// Permisos: rol waiter/cashier/owner (platformAdmin/isAdmin pasan) +
// acceso al branch de la mesa.
router.post(
  '/orders/staff',
  authMiddleware.requireRole('waiter', 'cashier', 'owner'),
  async (req, res) => {
    try {
      const { tableId, items, notes } = req.body || {};
      const parsedTableId = parseInt(tableId, 10);
      if (!Number.isFinite(parsedTableId)) {
        return res.status(400).json({ error: 'tableId requerido' });
      }

      const table = await Table.findByPk(parsedTableId);
      if (!table) {
        return res.status(404).json({ error: 'Mesa no encontrada' });
      }

      if (!req.user.isAdmin) {
        const authService = require('../services/auth');
        const hasAccess = await authService.hasPermission(req.user.id, 'branch', table.branchId);
        if (!hasAccess) {
          return res.status(403).json({ error: 'Access denied to this branch' });
        }
      }

      const order = await orderService.staffAddOrder({
        tableId: parsedTableId,
        userId: req.user.id,
        items,
        notes
      });
      res.status(201).json(order);
    } catch (error) {
      console.error('Error creating staff order:', error);
      res.status(error.statusCode || 500).json({ error: error.message || 'Error creating staff order' });
    }
  }
);

// POST /api/orders/:orderId/mark-ready — mozo marca pedido como entregado.
// Status pending → ready + Event "Nuevo Pedido" se marca seenAt (la card
// purple desaparece y futuros pedidos NO mergean en este order).
router.post('/orders/:orderId/mark-ready', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { Order } = require('../models');
    const existing = await Order.findByPk(orderId);
    if (!existing) {
      return res.status(404).json({ error: 'Order no encontrado' });
    }

    // Permisos: requiere acceso al branch del order.
    if (!req.user.isAdmin) {
      const authService = require('../services/auth');
      const hasAccess = await authService.hasPermission(req.user.id, 'branch', existing.branchId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this branch' });
      }
    }

    const order = await orderService.markOrderReady({ orderId });
    res.json(order);
  } catch (error) {
    console.error('Error marking order ready:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Error marking order ready' });
  }
});

module.exports = router;