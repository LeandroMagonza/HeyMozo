const { EventType, EventConfiguration } = require("../models");
const sequelize = require("../config/database");

// Environment check for verbose logging
const isProduction = process.env.NODE_ENV === 'production';
const debugLog = (...args) => {
  if (!isProduction) {
    console.log(...args);
  }
};

class EventConfigService {
  static async createDefaultEventTypes(companyId, createdBy = null) {
    debugLog(
      "🚀 createDefaultEventTypes called for company:",
      companyId,
      "createdBy:",
      createdBy
    );

    const defaultEventTypes = [
      // System Events (cannot be deleted)
      {
        eventName: "Location Scanned",
        stateName: "Scanned",
        userColor: "#6c757d",
        userFontColor: "#ffffff",
        userIcon: null,
        adminColor: "#e9ecef",
        priority: 100,
        systemEventType: "SCAN",
        isDefault: true,
      },
      {
        eventName: "Acknowledged",
        stateName: "Seen",
        userColor: "#28a745",
        userFontColor: "#ffffff",
        userIcon: null,
        adminColor: "#d4edda",
        priority: 90,
        systemEventType: "MARK_SEEN",
        isDefault: true,
      },
      {
        eventName: "Occupy Location",
        stateName: "Occupied",
        userColor: "#ffc107",
        userFontColor: "#000000",
        userIcon: null,
        adminColor: "#fff3cd",
        priority: 80,
        systemEventType: "OCCUPY",
        isDefault: true,
      },
      {
        eventName: "Vacate Location",
        stateName: "Available",
        userColor: "#28a745",
        userFontColor: "#ffffff",
        userIcon: null,
        adminColor: "#d1ecf1",
        priority: 70,
        systemEventType: "VACATE",
        isDefault: true,
      },
      // Default Custom Events (can be modified/deleted)
      {
        eventName: "Call Waiter",
        stateName: "Waiter Called",
        userColor: "#007bff",
        userFontColor: "#ffffff",
        userIcon: "FaUser",
        adminColor: "#ffc107",
        priority: 50,
        systemEventType: null,
        isDefault: true,
      },
      {
        eventName: "Request Check",
        stateName: "Check Requested",
        userColor: "#28a745",
        userFontColor: "#ffffff",
        userIcon: "FaFileInvoiceDollar",
        adminColor: "#17a2b8",
        priority: 40,
        systemEventType: null,
        isDefault: true,
      },
      {
        eventName: "Call Manager",
        stateName: "Manager Called",
        userColor: "#dc3545",
        userFontColor: "#ffffff",
        userIcon: "FaUserTie",
        adminColor: "#fd7e14",
        priority: 60,
        systemEventType: null,
        isDefault: true,
      },
    ];

    debugLog(
      "📦 Preparing",
      defaultEventTypes.length,
      "default event types to create"
    );

    // Use transaction for atomicity
    const transaction = await sequelize.transaction();

    try {
      const eventTypesToCreate = defaultEventTypes.map((eventType) => ({
        ...eventType,
        companyId,
        isActive: true,
        createdBy,
        updatedBy: createdBy,
      }));

      debugLog("💾 Creating event types with bulkCreate...");
      const createdEventTypes = await EventType.bulkCreate(eventTypesToCreate, { transaction });
      debugLog("✅ Created", createdEventTypes.length, "event types");

      // Create default EventConfigurations for the company
      const eventConfigurations = createdEventTypes.map((eventType) => ({
        resourceType: "company",
        resourceId: companyId,
        eventTypeId: eventType.id,
        enabled: true,
        createdBy,
        updatedBy: createdBy,
      }));

      debugLog(
        "💾 Creating",
        eventConfigurations.length,
        "event configurations..."
      );

      // Use individual creates instead of bulkCreate to handle duplicates gracefully
      let successCount = 0;
      let skipCount = 0;

      for (const config of eventConfigurations) {
        try {
          await EventConfiguration.create(config, { transaction });
          successCount++;
        } catch (error) {
          // Skip if already exists (idempotent operation)
          if (
            error.message.includes("duplicate") ||
            error.message.includes("unique constraint")
          ) {
            debugLog(
              "⚠️  Skipping duplicate event configuration for eventTypeId:",
              config.eventTypeId
            );
            skipCount++;
          } else {
            throw error; // Re-throw to trigger rollback
          }
        }
      }

      // Commit transaction
      await transaction.commit();

      debugLog(
        "✅ Event configurations created:",
        successCount,
        "skipped:",
        skipCount
      );
      debugLog("🎉 createDefaultEventTypes completed successfully");

      return createdEventTypes;
    } catch (error) {
      // Rollback on any error
      await transaction.rollback();
      console.error("❌ createDefaultEventTypes failed, rolled back:", error.message);
      throw error;
    }
  }

  static async resolveEventsForTable(tableId, includeSystemEvents = false) {
    console.log(
      "🔄 resolveEventsForTable called for table:",
      tableId,
      "includeSystemEvents:",
      includeSystemEvents
    );
    const { Table, Branch, Company } = require("../models");

    // Get table with its branch and company
    const table = await Table.findByPk(tableId, {
      include: [
        {
          model: Branch,
          include: [{ model: Company }],
        },
      ],
    });

    if (!table) {
      throw new Error("Table not found");
    }

    const companyId = table.Branch.Company.id;
    const branchId = table.Branch.id;

    console.log(
      "🏢 Table details - companyId:",
      companyId,
      "branchId:",
      branchId
    );

    return await this.getAllEventsWithConfiguration(
      "location",
      tableId,
      companyId,
      branchId,
      includeSystemEvents
    );
  }

  static async getAllEventsWithConfiguration(
    resourceType,
    resourceId,
    companyId,
    branchId = null,
    includeSystemEvents = true
  ) {
    const { Sequelize, Op } = require("sequelize");

    debugLog(
      `📋 getAllEventsWithConfiguration called for ${resourceType}:${resourceId}, companyId:${companyId}, branchId:${branchId}`
    );

    // Build where clause to get:
    // 1. Company-level events (branchId is null)
    // 2. Branch-specific events (branchId matches current branch)
    const whereClause = {
      companyId,
      isActive: true,
      [Op.or]: [
        { branchId: null }, // Company-level events
        ...(branchId ? [{ branchId: parseInt(branchId) }] : []), // Branch-specific events
      ],
    };

    if (!includeSystemEvents) {
      whereClause.systemEventType = null;
    }

    // Get all event types for the company (and branch if applicable)
    const eventTypes = await EventType.findAll({
      where: whereClause,
      order: [
        ["priority", "DESC"],
        ["eventName", "ASC"],
      ],
    });

    debugLog(`📋 Found ${eventTypes.length} event types for company ${companyId}`);

    // OPTIMIZATION: Load all configurations at once instead of N+1 queries
    const eventTypeIds = eventTypes.map(et => et.id);

    // Build resource conditions for all hierarchy levels
    const resourceConditions = [
      { resourceType: "company", resourceId: parseInt(companyId) }
    ];

    if (branchId) {
      resourceConditions.push({ resourceType: "branch", resourceId: parseInt(branchId) });
    }

    if (resourceType === "location") {
      resourceConditions.push({ resourceType: "location", resourceId: parseInt(resourceId) });
    }

    // Single query to get all relevant configurations
    const allConfigs = await EventConfiguration.findAll({
      where: {
        eventTypeId: { [Op.in]: eventTypeIds },
        [Op.or]: resourceConditions
      }
    });

    // Index configurations for O(1) lookup
    const configIndex = new Map();
    for (const config of allConfigs) {
      const key = `${config.resourceType}:${config.resourceId}:${config.eventTypeId}`;
      configIndex.set(key, config);
    }

    // Helper to find most specific config
    const findEffectiveConfig = (eventTypeId) => {
      // Priority: location > branch > company
      const lookupOrder = [];

      if (resourceType === "location") {
        lookupOrder.push(`location:${parseInt(resourceId)}:${eventTypeId}`);
      }
      if (branchId) {
        lookupOrder.push(`branch:${parseInt(branchId)}:${eventTypeId}`);
      }
      lookupOrder.push(`company:${parseInt(companyId)}:${eventTypeId}`);

      for (const key of lookupOrder) {
        const config = configIndex.get(key);
        if (config) return config;
      }
      return null;
    };

    // Process all event types with pre-loaded configurations
    const eventsWithConfig = eventTypes.map(eventType => {
      const effectiveConfig = findEffectiveConfig(eventType.id);

      // Start with the base EventType values
      const resolvedEvent = {
        ...eventType.toJSON(),
        enabled: effectiveConfig ? effectiveConfig.enabled : true,
        configuredAt: effectiveConfig ? effectiveConfig.resourceType : null,
        configurationId: effectiveConfig ? effectiveConfig.id : null,
      };

      // Apply overrides from configuration if they exist
      if (effectiveConfig) {
        const overrideFields = [
          'eventName', 'stateName', 'userColor', 'userFontColor',
          'userIcon', 'adminColor', 'priority'
        ];

        for (const field of overrideFields) {
          if (effectiveConfig[field] !== null) {
            resolvedEvent[field] = effectiveConfig[field];
          }
        }
      }

      return resolvedEvent;
    });

    return eventsWithConfig;
  }

  static async getEventWithOverrides(
    eventTypeId,
    resourceType,
    resourceId,
    companyId,
    branchId = null
  ) {
    // Get the base EventType
    const eventType = await EventType.findByPk(eventTypeId);
    if (!eventType) {
      throw new Error("EventType not found");
    }

    // Build configuration lookup hierarchy
    const configQueries = [];

    if (resourceType === "location") {
      configQueries.push({
        resourceType: "location",
        resourceId: parseInt(resourceId),
        eventTypeId: eventTypeId,
      });
    }

    if (branchId) {
      configQueries.push({
        resourceType: "branch",
        resourceId: parseInt(branchId),
        eventTypeId: eventTypeId,
      });
    }

    configQueries.push({
      resourceType: "company",
      resourceId: parseInt(companyId),
      eventTypeId: eventTypeId,
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
      configuredAt: effectiveConfig ? effectiveConfig.resourceType : null,
    };

    // Apply overrides if they exist
    if (effectiveConfig) {
      const overrideFields = [
        "eventName",
        "stateName",
        "userColor",
        "userFontColor",
        "userIcon",
        "adminColor",
        "priority",
      ];
      overrideFields.forEach((field) => {
        if (effectiveConfig[field] !== null) {
          resolvedEvent[field] = effectiveConfig[field];
        }
      });
    }

    return resolvedEvent;
  }

  static async getEffectiveEventsForResource(
    resourceType,
    resourceId,
    companyId,
    branchId = null,
    includeSystemEvents = true
  ) {
    const { Sequelize, Op } = require("sequelize");

    // Build where clause to get:
    // 1. Company-level events (branchId is null)
    // 2. Branch-specific events (branchId matches current branch)
    const whereClause = {
      companyId,
      isActive: true,
      [Op.or]: [
        { branchId: null }, // Company-level events
        ...(branchId ? [{ branchId: parseInt(branchId) }] : []), // Branch-specific events
      ],
    };

    if (!includeSystemEvents) {
      whereClause.systemEventType = null;
    }

    // Get all event types for the company (and branch if applicable)
    const eventTypes = await EventType.findAll({
      where: whereClause,
      order: [
        ["priority", "DESC"],
        ["eventName", "ASC"],
      ],
    });

    // OPTIMIZATION: Load all configurations at once instead of N+1 queries
    const eventTypeIds = eventTypes.map(et => et.id);

    // Build resource conditions for all hierarchy levels
    const resourceConditions = [
      { resourceType: "company", resourceId: parseInt(companyId) }
    ];

    if (branchId) {
      resourceConditions.push({ resourceType: "branch", resourceId: parseInt(branchId) });
    }

    if (resourceType === "location") {
      resourceConditions.push({ resourceType: "location", resourceId: parseInt(resourceId) });
    }

    // Single query to get all relevant configurations
    const allConfigs = await EventConfiguration.findAll({
      where: {
        eventTypeId: { [Op.in]: eventTypeIds },
        [Op.or]: resourceConditions
      }
    });

    // Index configurations for O(1) lookup
    const configIndex = new Map();
    for (const config of allConfigs) {
      const key = `${config.resourceType}:${config.resourceId}:${config.eventTypeId}`;
      configIndex.set(key, config);
    }

    // Helper to find most specific config
    const findEffectiveConfig = (eventTypeId) => {
      // Priority: location > branch > company
      const lookupOrder = [];

      if (resourceType === "location") {
        lookupOrder.push(`location:${parseInt(resourceId)}:${eventTypeId}`);
      }
      if (branchId) {
        lookupOrder.push(`branch:${parseInt(branchId)}:${eventTypeId}`);
      }
      lookupOrder.push(`company:${parseInt(companyId)}:${eventTypeId}`);

      for (const key of lookupOrder) {
        const config = configIndex.get(key);
        if (config) return config;
      }
      return null;
    };

    // Process all event types with pre-loaded configurations
    const eventsWithConfig = [];

    for (const eventType of eventTypes) {
      const effectiveConfig = findEffectiveConfig(eventType.id);
      const enabled = effectiveConfig ? effectiveConfig.enabled : true;

      // Only include enabled events in the result
      if (enabled) {
        // Start with the base EventType values
        const resolvedEvent = {
          ...eventType.toJSON(),
          enabled: true,
          configuredAt: effectiveConfig ? effectiveConfig.resourceType : null,
        };

        // Apply overrides from configuration if they exist
        if (effectiveConfig) {
          const overrideFields = [
            'eventName', 'stateName', 'userColor', 'userFontColor',
            'userIcon', 'adminColor', 'priority'
          ];

          for (const field of overrideFields) {
            if (effectiveConfig[field] !== null) {
              resolvedEvent[field] = effectiveConfig[field];
            }
          }
        }

        eventsWithConfig.push(resolvedEvent);
      }
    }

    return eventsWithConfig;
  }

  static async getCustomerEventsForTable(tableId) {
    console.log(
      "📱📱📱 getCustomerEventsForTable DEFINITELY called for table:",
      tableId
    );
    const result = await this.resolveEventsForTable(tableId, false); // Exclude system events
    console.log(
      "📱📱📱 getCustomerEventsForTable result count:",
      result.length
    );
    return result;
  }

  static async getAdminEventsForTable(tableId) {
    return await this.resolveEventsForTable(tableId, true); // Include system events
  }

  // Alias method for backward compatibility
  static async getEffectiveEvents(
    resourceType,
    resourceId,
    companyId,
    branchId = null
  ) {
    // For table resources, we need to get the branchId if not provided
    if (resourceType === "table" && !branchId) {
      const { Table, Branch } = require("../models");
      const table = await Table.findByPk(resourceId, {
        include: [{ model: Branch }],
      });
      if (table) {
        branchId = table.Branch.id;
      }
    }

    return await this.getEffectiveEventsForResource(
      resourceType,
      resourceId,
      companyId,
      branchId,
      false
    );
  }

  static async findEventTypeByLegacyType(legacyType, companyId) {
    console.log(
      `Looking for legacy event type: ${legacyType} in company ${companyId}`
    );

    // Helper method to migrate existing events
    const legacyMapping = {
      CALL_WAITER: { eventName: "Call Waiter", systemEventType: null },
      REQUEST_CHECK: { eventName: "Request Check", systemEventType: null },
      CALL_MANAGER: { eventName: "Call Manager", systemEventType: null },
      MARK_SEEN: { eventName: null, systemEventType: "MARK_SEEN" },
      SCAN: { eventName: null, systemEventType: "SCAN" },
    };

    const mapping = legacyMapping[legacyType];
    if (!mapping) {
      throw new Error(`Unknown legacy event type: ${legacyType}`);
    }

    const whereClause = {
      companyId,
      isActive: true,
    };

    // For system events, search by systemEventType
    if (mapping.systemEventType) {
      whereClause.systemEventType = mapping.systemEventType;
    } else {
      // For custom events, search by eventName
      whereClause.eventName = mapping.eventName;
    }

    console.log("Where clause:", whereClause);

    const eventType = await EventType.findOne({
      where: whereClause,
    });

    console.log("Found eventType:", eventType ? eventType.id : "null");

    if (!eventType) {
      // Let's see what EventTypes exist for this company
      const allEventTypes = await EventType.findAll({
        where: { companyId, isActive: true },
        attributes: ["id", "eventName", "systemEventType"],
      });
      console.log(
        "All EventTypes for company:",
        allEventTypes.map((et) => et.toJSON())
      );

      throw new Error(
        `EventType not found for legacy type: ${legacyType} in company ${companyId}`
      );
    }

    return eventType;
  }
}

module.exports = EventConfigService;
