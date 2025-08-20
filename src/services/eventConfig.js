const { EventType, EventConfiguration } = require('../models');

class EventConfigService {
  static async createDefaultEventTypes(companyId, createdBy = null) {
    const defaultEventTypes = [
      // System Events (cannot be deleted)
      {
        eventName: 'Location Scanned',
        stateName: 'Scanned',
        userColor: '#6c757d',
        userFontColor: '#ffffff',
        userIcon: null,
        adminColor: '#e9ecef',
        priority: 100,
        systemEventType: 'SCAN',
        isDefault: true
      },
      {
        eventName: 'Acknowledged',
        stateName: 'Seen',
        userColor: '#28a745',
        userFontColor: '#ffffff',
        userIcon: null,
        adminColor: '#d4edda',
        priority: 90,
        systemEventType: 'MARK_SEEN',
        isDefault: true
      },
      {
        eventName: 'Occupy Location',
        stateName: 'Occupied',
        userColor: '#ffc107',
        userFontColor: '#000000',
        userIcon: null,
        adminColor: '#fff3cd',
        priority: 80,
        systemEventType: 'OCCUPY',
        isDefault: true
      },
      {
        eventName: 'Vacate Location',
        stateName: 'Available',
        userColor: '#28a745',
        userFontColor: '#ffffff',
        userIcon: null,
        adminColor: '#d1ecf1',
        priority: 70,
        systemEventType: 'VACATE',
        isDefault: true
      },
      // Default Custom Events (can be modified/deleted)
      {
        eventName: 'Call Waiter',
        stateName: 'Waiter Called',
        userColor: '#007bff',
        userFontColor: '#ffffff',
        userIcon: 'FaUser',
        adminColor: '#ffc107',
        priority: 50,
        systemEventType: null,
        isDefault: true
      },
      {
        eventName: 'Request Check',
        stateName: 'Check Requested',
        userColor: '#28a745',
        userFontColor: '#ffffff',
        userIcon: 'FaFileInvoiceDollar',
        adminColor: '#17a2b8',
        priority: 40,
        systemEventType: null,
        isDefault: true
      },
      {
        eventName: 'Call Manager',
        stateName: 'Manager Called',
        userColor: '#dc3545',
        userFontColor: '#ffffff',
        userIcon: 'FaUserTie',
        adminColor: '#fd7e14',
        priority: 60,
        systemEventType: null,
        isDefault: true
      }
    ];

    const eventTypesToCreate = defaultEventTypes.map(eventType => ({
      ...eventType,
      companyId,
      isActive: true,
      createdBy,
      updatedBy: createdBy
    }));

    const createdEventTypes = await EventType.bulkCreate(eventTypesToCreate);
    
    // Create default EventConfigurations for the company
    const { EventConfiguration } = require('../models');
    const eventConfigurations = createdEventTypes.map(eventType => ({
      resourceType: 'company',
      resourceId: companyId,
      eventTypeId: eventType.id,
      enabled: true,
      createdBy,
      updatedBy: createdBy
    }));
    
    // Use individual creates instead of bulkCreate to avoid constraint issues
    for (const config of eventConfigurations) {
      try {
        await EventConfiguration.create(config);
      } catch (error) {
        // Skip if already exists
        if (!error.message.includes('duplicate') && !error.message.includes('unique constraint')) {
          throw error;
        }
      }
    }
    
    return createdEventTypes;
  }

  static async resolveEventsForTable(tableId, includeSystemEvents = false) {
    console.log('🔄 resolveEventsForTable called for table:', tableId, 'includeSystemEvents:', includeSystemEvents);
    const { Table, Branch, Company } = require('../models');
    
    // Get table with its branch and company
    const table = await Table.findByPk(tableId, {
      include: [{
        model: Branch,
        include: [{ model: Company }]
      }]
    });

    if (!table) {
      throw new Error('Table not found');
    }

    const companyId = table.Branch.Company.id;
    const branchId = table.Branch.id;
    
    console.log('🏢 Table details - companyId:', companyId, 'branchId:', branchId);

    return await this.getEffectiveEventsForResource('location', tableId, companyId, branchId, includeSystemEvents);
  }

  static async getAllEventsWithConfiguration(resourceType, resourceId, companyId, branchId = null, includeSystemEvents = true) {
    const { Sequelize } = require('sequelize');
    
    const whereClause = {
      companyId,
      isActive: true
    };

    if (!includeSystemEvents) {
      whereClause.systemEventType = null;
    }

    // Get all event types for the company
    const eventTypes = await EventType.findAll({
      where: whereClause,
      order: [
        ['priority', 'DESC'],
        ['eventName', 'ASC']
      ]
    });

    // For each event type, find the most specific configuration (location > branch > company)
    const eventsWithConfig = [];
    
    for (const eventType of eventTypes) {
      let enabled = true; // Default enabled if no configuration exists
      
      // Build configuration lookup based on resource hierarchy
      const configQueries = [];
      
      // Most specific: location/table level
      if (resourceType === 'location') {
        configQueries.push({
          resourceType: 'location',
          resourceId: parseInt(resourceId),
          eventTypeId: eventType.id
        });
      }
      
      // Branch level
      if (branchId) {
        configQueries.push({
          resourceType: 'branch', 
          resourceId: parseInt(branchId),
          eventTypeId: eventType.id
        });
      }
      
      // Company level
      configQueries.push({
        resourceType: 'company',
        resourceId: parseInt(companyId),
        eventTypeId: eventType.id
      });
      
      // Find the most specific configuration
      let effectiveConfig = null;
      for (const query of configQueries) {
        const config = await EventConfiguration.findOne({ where: query });
        if (config) {
          effectiveConfig = config;
          break; // Use the most specific configuration found
        }
      }
      
      // If we found a configuration, use its enabled status
      if (effectiveConfig) {
        enabled = effectiveConfig.enabled;
      }
      
      // Return ALL events with their configuration status (don't filter)
      eventsWithConfig.push({
        ...eventType.toJSON(),
        enabled: enabled
      });
    }

    return eventsWithConfig;
  }

  static async getEffectiveEventsForResource(resourceType, resourceId, companyId, branchId = null, includeSystemEvents = true) {
    const { Sequelize } = require('sequelize');
    
    const whereClause = {
      companyId,
      isActive: true
    };

    if (!includeSystemEvents) {
      whereClause.systemEventType = null;
    }

    // Get all event types for the company
    const eventTypes = await EventType.findAll({
      where: whereClause,
      order: [
        ['priority', 'DESC'],
        ['eventName', 'ASC']
      ]
    });

    // For each event type, find the most specific configuration (location > branch > company)
    const eventsWithConfig = [];
    
    for (const eventType of eventTypes) {
      let enabled = true; // Default enabled if no configuration exists
      
      // Build configuration lookup based on resource hierarchy
      const configQueries = [];
      
      // Most specific: location/table level
      if (resourceType === 'location') {
        configQueries.push({
          resourceType: 'location',
          resourceId: parseInt(resourceId),
          eventTypeId: eventType.id
        });
      }
      
      // Branch level
      if (branchId) {
        configQueries.push({
          resourceType: 'branch', 
          resourceId: parseInt(branchId),
          eventTypeId: eventType.id
        });
      }
      
      // Company level
      configQueries.push({
        resourceType: 'company',
        resourceId: parseInt(companyId),
        eventTypeId: eventType.id
      });
      
      console.log(`🔍 Resolving ${eventType.eventName} for ${resourceType}:${resourceId}`);
      console.log('  Config queries:', configQueries);
      
      // Find the most specific configuration
      let effectiveConfig = null;
      for (const query of configQueries) {
        const config = await EventConfiguration.findOne({ where: query });
        console.log(`  Query ${query.resourceType}:${query.resourceId} -> ${config ? `enabled:${config.enabled}` : 'not found'}`);
        if (config) {
          effectiveConfig = config;
          break; // Use the most specific configuration found
        }
      }
      
      // If we found a configuration, use its enabled status
      if (effectiveConfig) {
        enabled = effectiveConfig.enabled;
      }
      
      console.log(`  Final result: ${eventType.eventName} = ${enabled ? 'ENABLED' : 'DISABLED'}`);
      
      // Only include enabled events in the result
      if (enabled) {
        eventsWithConfig.push({
          ...eventType.toJSON(),
          enabled: true
        });
      }
    }

    return eventsWithConfig;
  }

  static async getCustomerEventsForTable(tableId) {
    console.log('📱📱📱 getCustomerEventsForTable DEFINITELY called for table:', tableId);
    const result = await this.resolveEventsForTable(tableId, false); // Exclude system events
    console.log('📱📱📱 getCustomerEventsForTable result count:', result.length);
    return result;
  }

  static async getAdminEventsForTable(tableId) {
    return await this.resolveEventsForTable(tableId, true); // Include system events
  }

  // Alias method for backward compatibility
  static async getEffectiveEvents(resourceType, resourceId, companyId, branchId = null) {
    // For table resources, we need to get the branchId if not provided
    if (resourceType === 'table' && !branchId) {
      const { Table, Branch } = require('../models');
      const table = await Table.findByPk(resourceId, {
        include: [{ model: Branch }]
      });
      if (table) {
        branchId = table.Branch.id;
      }
    }
    
    return await this.getEffectiveEventsForResource(resourceType, resourceId, companyId, branchId, false);
  }

  static async findEventTypeByLegacyType(legacyType, companyId) {
    console.log(`Looking for legacy event type: ${legacyType} in company ${companyId}`);
    
    // Helper method to migrate existing events
    const legacyMapping = {
      'CALL_WAITER': { eventName: 'Call Waiter', systemEventType: null },
      'REQUEST_CHECK': { eventName: 'Request Check', systemEventType: null },
      'CALL_MANAGER': { eventName: 'Call Manager', systemEventType: null },
      'MARK_SEEN': { eventName: null, systemEventType: 'MARK_SEEN' },
      'SCAN': { eventName: null, systemEventType: 'SCAN' }
    };

    const mapping = legacyMapping[legacyType];
    if (!mapping) {
      throw new Error(`Unknown legacy event type: ${legacyType}`);
    }

    const whereClause = {
      companyId,
      isActive: true
    };

    // For system events, search by systemEventType
    if (mapping.systemEventType) {
      whereClause.systemEventType = mapping.systemEventType;
    } else {
      // For custom events, search by eventName
      whereClause.eventName = mapping.eventName;
    }

    console.log('Where clause:', whereClause);

    const eventType = await EventType.findOne({
      where: whereClause
    });

    console.log('Found eventType:', eventType ? eventType.id : 'null');

    if (!eventType) {
      // Let's see what EventTypes exist for this company
      const allEventTypes = await EventType.findAll({
        where: { companyId, isActive: true },
        attributes: ['id', 'eventName', 'systemEventType']
      });
      console.log('All EventTypes for company:', allEventTypes.map(et => et.toJSON()));
      
      throw new Error(`EventType not found for legacy type: ${legacyType} in company ${companyId}`);
    }

    return eventType;
  }
}

module.exports = EventConfigService;