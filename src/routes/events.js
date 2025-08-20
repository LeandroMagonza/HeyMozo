const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { EventType, EventConfiguration, Company, Branch, Table } = require('../models');
const EventConfigService = require('../services/eventConfig');

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate);

// GET /api/companies/:companyId/event-types - List company event types
router.get('/companies/:companyId/event-types', authMiddleware.checkCompanyPermission, async (req, res) => {
  try {
    const eventTypes = await EventType.findAll({
      where: {
        companyId: req.params.companyId,
        isActive: true
      },
      order: [
        ['priority', 'DESC'],
        ['eventName', 'ASC']
      ]
    });

    res.json(eventTypes);
  } catch (error) {
    console.error('Error fetching event types:', error);
    res.status(500).json({ error: 'Error fetching event types' });
  }
});

// POST /api/companies/:companyId/event-types - Create new event type
router.post('/companies/:companyId/event-types', authMiddleware.checkCompanyPermission, async (req, res) => {
  try {
    const eventType = await EventType.create({
      ...req.body,
      companyId: req.params.companyId,
      createdBy: req.user.id,
      updatedBy: req.user.id,
      systemEventType: null // Only allow custom events through this endpoint
    });

    res.status(201).json(eventType);
  } catch (error) {
    console.error('Error creating event type:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors.map(e => e.message) 
      });
    }
    res.status(500).json({ error: 'Error creating event type' });
  }
});

// PATCH /api/event-types/:eventId - Partial update event type (with system protection)
router.patch('/event-types/:eventId', async (req, res) => {
  try {
    const eventType = await EventType.findByPk(req.params.eventId);
    
    if (!eventType) {
      return res.status(404).json({ error: 'Event type not found' });
    }

    // Check company permission
    const hasPermission = req.user.isAdmin || 
      await require('../services/auth').hasPermission(req.user.id, 'company', eventType.companyId);
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied to this company' });
    }

    // System event protection - only allow text, color, and icon changes
    if (eventType.systemEventType) {
      const allowedFields = ['eventName', 'userColor', 'userFontColor', 'userIcon', 'stateName', 'adminColor'];
      const updateData = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
      
      updateData.updatedBy = req.user.id;
      await eventType.update(updateData);
    } else {
      // Custom events can be fully updated
      const updateData = {
        ...req.body,
        updatedBy: req.user.id,
        systemEventType: eventType.systemEventType // Preserve system type
      };
      await eventType.update(updateData);
    }

    res.json(eventType);
  } catch (error) {
    console.error('Error updating event type:', error);
    res.status(500).json({ error: 'Error updating event type' });
  }
});

// PUT /api/event-types/:eventId - Update event type (with system protection)
router.put('/event-types/:eventId', async (req, res) => {
  try {
    const eventType = await EventType.findByPk(req.params.eventId);
    
    if (!eventType) {
      return res.status(404).json({ error: 'Event type not found' });
    }

    // Check company permission
    const hasPermission = req.user.isAdmin || 
      await require('../services/auth').hasPermission(req.user.id, 'company', eventType.companyId);
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied to this company' });
    }

    // System event protection - only allow text, color, and icon changes
    if (eventType.systemEventType) {
      const allowedFields = ['eventName', 'userColor', 'userFontColor', 'userIcon', 'stateName', 'adminColor'];
      const updateData = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
      
      updateData.updatedBy = req.user.id;
      await eventType.update(updateData);
    } else {
      // Custom events can be fully updated
      await eventType.update({
        ...req.body,
        updatedBy: req.user.id,
        systemEventType: eventType.systemEventType // Preserve system type
      });
    }

    res.json(eventType);
  } catch (error) {
    console.error('Error updating event type:', error);
    if (error.message === 'System events cannot be deleted' || 
        error.message === 'System event type cannot be changed') {
      return res.status(400).json({ error: error.message });
    }
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors.map(e => e.message) 
      });
    }
    res.status(500).json({ error: 'Error updating event type' });
  }
});

// DELETE /api/event-types/:eventId - Soft delete event type (fails for system events)
router.delete('/event-types/:eventId', async (req, res) => {
  try {
    const eventType = await EventType.findByPk(req.params.eventId);
    
    if (!eventType) {
      return res.status(404).json({ error: 'Event type not found' });
    }

    // Check company permission
    const hasPermission = req.user.isAdmin || 
      await require('../services/auth').hasPermission(req.user.id, 'company', eventType.companyId);
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied to this company' });
    }

    // System events cannot be deleted
    if (eventType.systemEventType) {
      return res.status(400).json({ error: 'System events cannot be deleted' });
    }

    await eventType.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting event type:', error);
    if (error.message === 'System events cannot be deleted') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error deleting event type' });
  }
});

// PUT /api/event-types/:eventId/rename - Rename system event (text/colors only)
router.put('/event-types/:eventId/rename', async (req, res) => {
  try {
    const eventType = await EventType.findByPk(req.params.eventId);
    
    if (!eventType) {
      return res.status(404).json({ error: 'Event type not found' });
    }

    // Check company permission
    const hasPermission = req.user.isAdmin || 
      await require('../services/auth').hasPermission(req.user.id, 'company', eventType.companyId);
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied to this company' });
    }

    // Only allow renaming system events
    if (!eventType.systemEventType) {
      return res.status(400).json({ error: 'This endpoint is only for system events' });
    }

    const allowedFields = ['eventName', 'userColor', 'userFontColor', 'userIcon', 'stateName', 'adminColor'];
    const updateData = {};
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }
    
    updateData.updatedBy = req.user.id;
    await eventType.update(updateData);

    res.json(eventType);
  } catch (error) {
    console.error('Error renaming event type:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors.map(e => e.message) 
      });
    }
    res.status(500).json({ error: 'Error renaming event type' });
  }
});

// GET /api/resources/:resourceType/:resourceId/events/config - Get resource configurations
router.get('/resources/:resourceType/:resourceId/events/config', async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    
    // Validate resource type
    if (!['company', 'branch', 'location'].includes(resourceType)) {
      return res.status(400).json({ error: 'Invalid resource type' });
    }

    // Check permissions based on resource type
    let hasPermission = req.user.isAdmin;
    
    if (!hasPermission) {
      const authService = require('../services/auth');
      switch (resourceType) {
        case 'company':
          hasPermission = await authService.hasPermission(req.user.id, 'company', parseInt(resourceId));
          break;
        case 'branch':
          hasPermission = await authService.hasPermission(req.user.id, 'branch', parseInt(resourceId));
          break;
        case 'location':
          hasPermission = await authService.hasPermission(req.user.id, 'table', parseInt(resourceId));
          break;
      }
    }
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied to this resource' });
    }

    const configurations = await EventConfiguration.findAll({
      where: {
        resourceType,
        resourceId: parseInt(resourceId)
      },
      include: [{
        model: EventType,
        as: 'eventType'
      }],
      order: [
        [{ model: EventType, as: 'eventType' }, 'priority', 'DESC'],
        [{ model: EventType, as: 'eventType' }, 'eventName', 'ASC']
      ]
    });

    res.json(configurations);
  } catch (error) {
    console.error('Error fetching event configurations:', error);
    res.status(500).json({ error: 'Error fetching event configurations' });
  }
});

// POST /api/resources/:resourceType/:resourceId/events/config - Bulk configure events
router.post('/resources/:resourceType/:resourceId/events/config', async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    const { configurations } = req.body; // Array of { eventTypeId, enabled }
    
    // Validate resource type
    if (!['company', 'branch', 'location'].includes(resourceType)) {
      return res.status(400).json({ error: 'Invalid resource type' });
    }

    // Check permissions
    let hasPermission = req.user.isAdmin;
    
    if (!hasPermission) {
      const authService = require('../services/auth');
      switch (resourceType) {
        case 'company':
          hasPermission = await authService.hasPermission(req.user.id, 'company', parseInt(resourceId));
          break;
        case 'branch':
          hasPermission = await authService.hasPermission(req.user.id, 'branch', parseInt(resourceId));
          break;
        case 'location':
          hasPermission = await authService.hasPermission(req.user.id, 'table', parseInt(resourceId));
          break;
      }
    }
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied to this resource' });
    }

    // Bulk update/create configurations
    const configUpdates = configurations.map(config => ({
      resourceType,
      resourceId: parseInt(resourceId),
      eventTypeId: config.eventTypeId,
      enabled: config.enabled,
      createdBy: req.user.id,
      updatedBy: req.user.id
    }));

    // Use individual upserts instead of bulkCreate with updateOnDuplicate
    for (const config of configUpdates) {
      await EventConfiguration.upsert(config);
    }

    const logger = require('../utils/logger');
    logger.info(`Updated ${configUpdates.length} event configurations for ${resourceType} ${resourceId}`);
    res.json({ message: 'Configurations updated successfully' });
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Failed to update event configurations', error);
    res.status(500).json({ error: 'Error updating event configurations' });
  }
});

// DELETE /api/resources/:resourceType/:resourceId/events/config/:eventTypeId - Remove specific event configuration
router.delete('/resources/:resourceType/:resourceId/events/config/:eventTypeId', async (req, res) => {
  try {
    const { resourceType, resourceId, eventTypeId } = req.params;
    
    const deleted = await EventConfiguration.destroy({
      where: {
        resourceType,
        resourceId: parseInt(resourceId),
        eventTypeId: parseInt(eventTypeId)
      }
    });
    
    if (deleted) {
      res.json({ message: 'Event configuration removed successfully' });
    } else {
      res.status(404).json({ error: 'Event configuration not found' });
    }
  } catch (error) {
    console.error('Error removing event configuration:', error);
    res.status(500).json({ error: 'Error removing event configuration' });
  }
});

// DELETE /api/resources/:resourceType/:resourceId/events/config - Reset to parent config
router.delete('/resources/:resourceType/:resourceId/events/config', async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    
    // Validate resource type
    if (!['company', 'branch', 'location'].includes(resourceType)) {
      return res.status(400).json({ error: 'Invalid resource type' });
    }

    // Check permissions
    let hasPermission = req.user.isAdmin;
    
    if (!hasPermission) {
      const authService = require('../services/auth');
      switch (resourceType) {
        case 'company':
          hasPermission = await authService.hasPermission(req.user.id, 'company', parseInt(resourceId));
          break;
        case 'branch':
          hasPermission = await authService.hasPermission(req.user.id, 'branch', parseInt(resourceId));
          break;
        case 'location':
          hasPermission = await authService.hasPermission(req.user.id, 'table', parseInt(resourceId));
          break;
      }
    }
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied to this resource' });
    }

    await EventConfiguration.destroy({
      where: {
        resourceType,
        resourceId: parseInt(resourceId)
      }
    });

    res.json({ message: 'Configurations reset successfully' });
  } catch (error) {
    console.error('Error resetting event configurations:', error);
    res.status(500).json({ error: 'Error resetting event configurations' });
  }
});

// POST /api/tables/:tableId/events - Create event with flexible input methods (eventTypeId, systemEventType, legacy type)
router.post('/tables/:tableId/events', async (req, res) => {
  console.log('EVENTS.JS ROUTE - Creating event for table:', req.params.tableId);
  console.log('EVENTS.JS ROUTE - Request body:', req.body);
  
  try {
    const { tableId } = req.params;
    const { type, eventTypeId, systemEventType, message } = req.body;

    console.log(`EVENTS.JS - Creating event for table ${tableId}:`, { type, eventTypeId, systemEventType, message });

    // Verify table exists and get company info
    const { Table: TableModel, Branch, Company, Event } = require('../models');
    const table = await TableModel.findByPk(tableId, {
      include: [{
        model: Branch,
        include: [{ model: Company }]
      }]
    });

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    if (!table.Branch || !table.Branch.Company) {
      return res.status(500).json({ error: 'Table has invalid branch/company association' });
    }

    const companyId = table.Branch.Company.id;
    console.log('EVENTS.JS - Extracted companyId:', companyId);
    let finalEventTypeId = eventTypeId;

    // Case 1: Custom event with eventTypeId provided
    if (eventTypeId && !systemEventType && !type) {
      finalEventTypeId = eventTypeId;
      console.log('EVENTS.JS - Using provided eventTypeId:', finalEventTypeId);
    }
    // Case 2: System event with systemEventType provided (SCAN, MARK_SEEN, OCCUPY, VACATE)
    else if (systemEventType && !eventTypeId) {
      try {
        console.log(`EVENTS.JS - Looking for system event: ${systemEventType} in company: ${companyId}`);
        
        // First, let's see what EventTypes exist for debugging
        const allEventTypes = await EventType.findAll({
          where: { companyId, isActive: true },
          attributes: ['id', 'eventName', 'systemEventType']
        });
        console.log('EVENTS.JS - All EventTypes for company:', allEventTypes.map(et => et.toJSON()));
        
        const eventType = await EventType.findOne({
          where: {
            companyId,
            systemEventType,
            isActive: true
          }
        });
        
        console.log('EVENTS.JS - Found eventType for systemEventType:', eventType ? eventType.toJSON() : 'null');
        
        if (!eventType) {
          return res.status(400).json({ error: `System event type ${systemEventType} not found for company ${companyId}` });
        }
        
        finalEventTypeId = eventType.id;
        console.log(`EVENTS.JS - Resolved system event '${systemEventType}' to eventTypeId: ${finalEventTypeId}`);
      } catch (error) {
        console.error('EVENTS.JS - Failed to resolve system event type:', error);
        return res.status(400).json({ error: `Invalid system event type: ${systemEventType}` });
      }
    }
    // Case 3: Legacy support - type string provided
    else if (type && !eventTypeId && !systemEventType) {
      try {
        const EventConfigService = require('../services/eventConfig');
        const eventType = await EventConfigService.findEventTypeByLegacyType(type, companyId);
        finalEventTypeId = eventType.id;
        console.log(`EVENTS.JS - Resolved legacy type '${type}' to eventTypeId: ${finalEventTypeId}`);
      } catch (error) {
        console.error('EVENTS.JS - Failed to resolve legacy event type:', error.message);
        return res.status(400).json({ error: `Invalid event type: ${type}` });
      }
    }

    if (!finalEventTypeId) {
      console.error('EVENTS.JS - No valid eventTypeId resolved');
      return res.status(400).json({ error: 'Either eventTypeId, systemEventType, or type is required' });
    }

    // Verify the resolved event type exists and belongs to the table's company
    const eventType = await EventType.findOne({
      where: {
        id: finalEventTypeId,
        companyId: companyId,
        isActive: true
      }
    });

    if (!eventType) {
      console.error('EVENTS.JS - Resolved eventTypeId not found or invalid:', finalEventTypeId);
      return res.status(400).json({ error: 'Invalid event type for this table' });
    }

    console.log('EVENTS.JS - Creating event with eventTypeId:', finalEventTypeId);

    // Create the event
    const event = await Event.create({
      tableId: parseInt(tableId),
      eventTypeId: parseInt(finalEventTypeId),
      type, // Keep for backward compatibility during migration
      message,
      seenAt: null
    });

    console.log('EVENTS.JS - Event created successfully:', event.id);

    // Return the created event with its type information
    const eventWithType = await Event.findByPk(event.id, {
      include: [{
        model: EventType,
        as: 'eventType'
      }]
    });

    res.status(201).json(eventWithType);
  } catch (error) {
    console.error('EVENTS.JS - Error creating event:', error);
    res.status(500).json({ error: 'Error creating event' });
  }
});

// GET /api/tables/:tableId/events/effective - Get effective events for customer UI (excludes system events)
router.get('/tables/:tableId/events/effective', async (req, res) => {
  try {
    const events = await EventConfigService.getCustomerEventsForTable(req.params.tableId);
    res.json(events);
  } catch (error) {
    console.error('Error fetching effective events:', error);
    if (error.message === 'Table not found') {
      return res.status(404).json({ error: 'Table not found' });
    }
    res.status(500).json({ error: 'Error fetching effective events' });
  }
});

// GET /api/tables/:tableId/events/all - Get all events including system events for admin
router.get('/tables/:tableId/events/all', async (req, res) => {
  try {
    const events = await EventConfigService.getAdminEventsForTable(req.params.tableId);
    res.json(events);
  } catch (error) {
    console.error('Error fetching all events:', error);
    if (error.message === 'Table not found') {
      return res.status(404).json({ error: 'Table not found' });
    }
    res.status(500).json({ error: 'Error fetching all events' });
  }
});

// GET /api/resources/:resourceType/:resourceId/events/resolved - Preview resolved configuration
router.get('/resources/:resourceType/:resourceId/events/resolved', async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    const { companyId, branchId } = req.query;
    
    // Validate resource type
    if (!['company', 'branch', 'location'].includes(resourceType)) {
      return res.status(400).json({ error: 'Invalid resource type' });
    }

    // Check permissions based on resource type
    let hasPermission = req.user.isAdmin;
    
    if (!hasPermission) {
      const authService = require('../services/auth');
      switch (resourceType) {
        case 'company':
          hasPermission = await authService.hasPermission(req.user.id, 'company', parseInt(resourceId));
          break;
        case 'branch':
          hasPermission = await authService.hasPermission(req.user.id, 'branch', parseInt(resourceId));
          break;
        case 'location':
          hasPermission = await authService.hasPermission(req.user.id, 'table', parseInt(resourceId));
          break;
      }
    }
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied to this resource' });
    }

    const events = await EventConfigService.getEffectiveEventsForResource(
      resourceType, 
      parseInt(resourceId), 
      parseInt(companyId), 
      branchId ? parseInt(branchId) : null
    );
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching resolved events:', error);
    res.status(500).json({ error: 'Error fetching resolved events' });
  }
});

module.exports = router;