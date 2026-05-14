const { EventType, EventConfiguration } = require('../models');

class EventConfigService {
  static async createDefaultEventTypes(companyId, createdBy = null) {
    const defaultEventTypes = [
      // ─── System Events (no se pueden borrar, ocultos al cliente) ────────
      {
        eventName: 'Página Escaneada',
        stateName: 'Escaneado',
        userColor: '#6c757d',
        userFontColor: '#ffffff',
        userIcon: null,
        adminColor: '#e9ecef',
        priority: 100,
        systemEventType: 'SCAN',
        customerDisplay: 'hidden',
        cardVariant: null,
        isDefault: true
      },
      {
        eventName: 'Visto',
        stateName: 'Visto',
        userColor: '#28a745',
        userFontColor: '#ffffff',
        userIcon: null,
        adminColor: '#d4edda',
        priority: 90,
        systemEventType: 'MARK_SEEN',
        customerDisplay: 'hidden',
        cardVariant: null,
        isDefault: true
      },
      {
        eventName: 'Ocupar Mesa',
        stateName: 'Ocupada',
        userColor: '#ffc107',
        userFontColor: '#000000',
        userIcon: null,
        adminColor: '#fff3cd',
        priority: 80,
        systemEventType: 'OCCUPY',
        customerDisplay: 'hidden',
        cardVariant: null,
        isDefault: true
      },
      {
        eventName: 'Mesa Disponible',
        stateName: 'Disponible',
        userColor: '#28a745',
        userFontColor: '#ffffff',
        userIcon: null,
        adminColor: '#d1ecf1',
        priority: 70,
        systemEventType: 'VACATE',
        customerDisplay: 'hidden',
        cardVariant: 'paid',
        isDefault: true
      },

      // ─── Botón principal del modal del cliente ──────────────────────────
      {
        eventName: 'Llamar al Mozo',
        stateName: 'Mozo llamado',
        userColor: '#e07b00',
        userFontColor: '#ffffff',
        userIcon: '🙋',
        adminColor: '#ffc107',
        priority: 50,
        systemEventType: null,
        customerDisplay: 'main_action',
        cardVariant: 'yellow',
        isDefault: true
      },

      // ─── Oculto en F1; será el botón Pagar en F2 ────────────────────────
      {
        eventName: 'Pedir Cuenta',
        stateName: 'Cuenta pedida',
        userColor: '#16a34a',
        userFontColor: '#ffffff',
        userIcon: 'FaFileInvoiceDollar',
        adminColor: '#17a2b8',
        priority: 40,
        systemEventType: null,
        customerDisplay: 'hidden',
        cardVariant: 'red',
        isDefault: true
      },

      // ─── Oculto en F1; habilitable desde admin en F2 ────────────────────
      {
        eventName: 'Llamar al Encargado',
        stateName: 'Encargado llamado',
        userColor: '#dc3545',
        userFontColor: '#ffffff',
        userIcon: 'FaUserTie',
        adminColor: '#fd7e14',
        priority: 60,
        systemEventType: null,
        customerDisplay: 'hidden',
        cardVariant: 'red',
        isDefault: true
      },

      // ─── Quick actions configurables (grid 2x2 del modal) ───────────────
      {
        eventName: 'Hielo',
        stateName: 'Solicitado',
        userColor: '#06b6d4',
        userFontColor: '#ffffff',
        userIcon: '🧊',
        adminColor: '#fef3c7',
        priority: 35,
        systemEventType: null,
        customerDisplay: 'quick_action',
        cardVariant: 'orange',
        isDefault: true
      },
      {
        eventName: 'Condimentos',
        stateName: 'Solicitado',
        userColor: '#f59e0b',
        userFontColor: '#ffffff',
        userIcon: '🧂',
        adminColor: '#fef3c7',
        priority: 32,
        systemEventType: null,
        customerDisplay: 'quick_action',
        cardVariant: 'orange',
        isDefault: true
      },
      {
        eventName: 'Servilletas',
        stateName: 'Solicitado',
        userColor: '#94a3b8',
        userFontColor: '#ffffff',
        userIcon: '📄',
        adminColor: '#fef3c7',
        priority: 30,
        systemEventType: null,
        customerDisplay: 'quick_action',
        cardVariant: 'orange',
        isDefault: true
      },
      {
        eventName: 'Limpiar mesa',
        stateName: 'Solicitado',
        userColor: '#10b981',
        userFontColor: '#ffffff',
        userIcon: '🧽',
        adminColor: '#fef3c7',
        priority: 28,
        systemEventType: null,
        customerDisplay: 'quick_action',
        cardVariant: 'orange',
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

    return await this.getAllEventsWithConfiguration('location', tableId, companyId, branchId, includeSystemEvents);
  }

  static async getAllEventsWithConfiguration(resourceType, resourceId, companyId, branchId = null, includeSystemEvents = true) {
    const { Sequelize } = require('sequelize');

    console.log(`📋 getAllEventsWithConfiguration called for ${resourceType}:${resourceId}, companyId:${companyId}, branchId:${branchId}, includeSystemEvents:${includeSystemEvents}`);

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

    console.log(`📋 Found ${eventTypes.length} event types for company ${companyId}`);

    // For each event type, find the most specific configuration (location > branch > company)
    const eventsWithConfig = [];

    for (const eventType of eventTypes) {
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

      // Start with the base EventType values
      const resolvedEvent = {
        ...eventType.toJSON(),
        enabled: effectiveConfig ? effectiveConfig.enabled : true,
        configuredAt: effectiveConfig ? effectiveConfig.resourceType : null,
        configurationId: effectiveConfig ? effectiveConfig.id : null
      };

      console.log(`  📦 Base event ${eventType.eventName}:`, {
        userColor: eventType.userColor,
        userFontColor: eventType.userFontColor,
        userIcon: eventType.userIcon
      });

      // Apply overrides from configuration if they exist
      if (effectiveConfig) {
        console.log(`  🔧 Config found for ${eventType.eventName}:`, {
          userColor: effectiveConfig.userColor,
          userFontColor: effectiveConfig.userFontColor,
          userIcon: effectiveConfig.userIcon,
          enabled: effectiveConfig.enabled
        });

        // Override fields only if they are explicitly set in the configuration
        if (effectiveConfig.eventName !== null) {
          resolvedEvent.eventName = effectiveConfig.eventName;
        }
        if (effectiveConfig.stateName !== null) {
          resolvedEvent.stateName = effectiveConfig.stateName;
        }
        if (effectiveConfig.userColor !== null) {
          resolvedEvent.userColor = effectiveConfig.userColor;
        }
        if (effectiveConfig.userFontColor !== null) {
          resolvedEvent.userFontColor = effectiveConfig.userFontColor;
        }
        if (effectiveConfig.userIcon !== null) {
          resolvedEvent.userIcon = effectiveConfig.userIcon;
        }
        if (effectiveConfig.adminColor !== null) {
          resolvedEvent.adminColor = effectiveConfig.adminColor;
        }
        if (effectiveConfig.priority !== null) {
          resolvedEvent.priority = effectiveConfig.priority;
        }
      }

      console.log(`  ✅ Final resolved event ${eventType.eventName}:`, {
        userColor: resolvedEvent.userColor,
        userFontColor: resolvedEvent.userFontColor,
        userIcon: resolvedEvent.userIcon,
        enabled: resolvedEvent.enabled
      });

      eventsWithConfig.push(resolvedEvent);
    }

    return eventsWithConfig;
  }

  static async getEventWithOverrides(eventTypeId, resourceType, resourceId, companyId, branchId = null) {
    // Get the base EventType
    const eventType = await EventType.findByPk(eventTypeId);
    if (!eventType) {
      throw new Error('EventType not found');
    }

    // Build configuration lookup hierarchy
    const configQueries = [];

    if (resourceType === 'location') {
      configQueries.push({
        resourceType: 'location',
        resourceId: parseInt(resourceId),
        eventTypeId: eventTypeId
      });
    }

    if (branchId) {
      configQueries.push({
        resourceType: 'branch',
        resourceId: parseInt(branchId),
        eventTypeId: eventTypeId
      });
    }

    configQueries.push({
      resourceType: 'company',
      resourceId: parseInt(companyId),
      eventTypeId: eventTypeId
    });

    // Find the most specific configuration
    let effectiveConfig = null;
    for (const query of configQueries) {
      const config = await EventConfiguration.findOne({ where: query });
      if (config) {
        effectiveConfig = config;
        break;
      }
    }

    // Start with base EventType and apply overrides
    const resolvedEvent = {
      ...eventType.toJSON(),
      enabled: effectiveConfig ? effectiveConfig.enabled : true,
      configuredAt: effectiveConfig ? effectiveConfig.resourceType : null
    };

    // Apply overrides if they exist
    if (effectiveConfig) {
      const overrideFields = ['eventName', 'stateName', 'userColor', 'userFontColor', 'userIcon', 'adminColor', 'priority'];
      overrideFields.forEach(field => {
        if (effectiveConfig[field] !== null) {
          resolvedEvent[field] = effectiveConfig[field];
        }
      });
    }

    return resolvedEvent;
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
        // Start with the base EventType values
        const resolvedEvent = {
          ...eventType.toJSON(),
          enabled: true,
          configuredAt: effectiveConfig ? effectiveConfig.resourceType : null
        };

        // Apply overrides from configuration if they exist
        if (effectiveConfig) {
          // Override fields only if they are explicitly set in the configuration
          if (effectiveConfig.eventName !== null) {
            resolvedEvent.eventName = effectiveConfig.eventName;
          }
          if (effectiveConfig.stateName !== null) {
            resolvedEvent.stateName = effectiveConfig.stateName;
          }
          if (effectiveConfig.userColor !== null) {
            resolvedEvent.userColor = effectiveConfig.userColor;
          }
          if (effectiveConfig.userFontColor !== null) {
            resolvedEvent.userFontColor = effectiveConfig.userFontColor;
          }
          if (effectiveConfig.userIcon !== null) {
            resolvedEvent.userIcon = effectiveConfig.userIcon;
          }
          if (effectiveConfig.adminColor !== null) {
            resolvedEvent.adminColor = effectiveConfig.adminColor;
          }
          if (effectiveConfig.priority !== null) {
            resolvedEvent.priority = effectiveConfig.priority;
          }
        }

        eventsWithConfig.push(resolvedEvent);
      }
    }

    return eventsWithConfig;
  }

  // Devuelve los EventTypes que el cliente puede disparar, agrupados por
  // dónde aparecen en la UI según `customerDisplay`.
  //
  // Shape:
  //   { quickActions: EventType[], mainActions: EventType[], all: EventType[] }
  //
  // Reglas:
  //   - System events siempre se excluyen.
  //   - 'hidden' se excluye.
  //   - 'main_action' → mainActions.
  //   - 'quick_action' o null (legacy/no asignado) → quickActions.
  //   - `all` queda con la unión, para callers que prefieren un array plano.
  static async getCustomerEventsForTable(tableId) {
    console.log('📱 getCustomerEventsForTable called for table:', tableId);
    const allEvents = await this.resolveEventsForTable(tableId, false); // sin system events

    const visible = allEvents.filter((e) => e.customerDisplay !== 'hidden');
    const mainActions = visible.filter((e) => e.customerDisplay === 'main_action');
    const quickActions = visible.filter(
      (e) => e.customerDisplay === 'quick_action' || e.customerDisplay == null
    );

    console.log(
      `📱 getCustomerEventsForTable: ${quickActions.length} quick, ${mainActions.length} main`
    );

    return { quickActions, mainActions, all: visible };
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

    // Helper to map legacy `type` strings (CALL_WAITER, etc.) to the new
    // EventType rows. Tras la migración 20260511 los defaults están en
    // español; los nombres en inglés ya no existen como filas activas.
    const legacyMapping = {
      'CALL_WAITER': { eventName: 'Llamar al Mozo', systemEventType: null },
      'REQUEST_CHECK': { eventName: 'Pedir Cuenta', systemEventType: null },
      'CALL_MANAGER': { eventName: 'Llamar al Encargado', systemEventType: null },
      'MARK_SEEN': { eventName: null, systemEventType: 'MARK_SEEN' },
      'MARK_AVAILABLE': { eventName: null, systemEventType: 'VACATE' },
      'MARK_OCCUPIED': { eventName: null, systemEventType: 'OCCUPY' },
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