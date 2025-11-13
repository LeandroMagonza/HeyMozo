// Load environment variables based on NODE_ENV
const environment = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: `.env.${environment}` });
const express = require('express');
const path = require('path');
const cors = require('cors');
const sequelize = require('./src/config/database');
const { 
  Company, 
  Branch, 
  Table, 
  Event,
  Permission,
  EventType 
} = require('./src/models');
const { Op } = require('sequelize');
const { EventTypes } = require('./src/constants');
const MailingList = require('./src/models/MailingList');
const { Client } = require('pg');

// Import auth routes and middleware
const authRoutes = require('./src/routes/auth');
const usersRoutes = require('./src/routes/users');
const eventsRoutes = require('./src/routes/events');
const apiRoutes = require('./src/routes/index');
const authMiddleware = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('Starting server setup');

// Middleware para parsear JSON y CORS
app.use(express.json());
app.use(cors());

// Add request logging middleware
app.use((req, res, next) => {
  const logger = require('./src/utils/logger');
  logger.request(req.method, req.url);
  next();
});

// Relations are defined in src/models/index.js
console.log('🔗 Loading model relationships...');
require('./src/models/index'); // This ensures all model relationships are loaded
console.log('✅ Model relationships loaded');

// Mount auth routes
console.log('🔧 Mounting auth routes at /api/auth');
app.use('/api/auth', authRoutes);
console.log('🔧 Mounting users routes at /api/users');
app.use('/api/users', usersRoutes);

// PUBLIC ROUTE: Mailing list (MUST be before eventsRoutes)
console.log('🔧 Registering PUBLIC route: POST /api/mailing-list (BEFORE other /api/* routes)');
app.post('/api/mailing-list', async (req, res) => {
  console.log('='.repeat(60));
  console.log('📧 MAILING LIST ENDPOINT HIT');
  console.log('='.repeat(60));
  console.log('📝 Request body:', req.body);
  console.log('🔐 Authorization header:', req.headers.authorization ? 'Present' : 'Not present');
  console.log('🌐 Request origin:', req.headers.origin || 'No origin');

  try {
    const { name, email, message } = req.body;

    console.log('✅ Attempting to create mailing list entry...');
    console.log('   Name:', name);
    console.log('   Email:', email);
    console.log('   Message:', message);

    const newEntry = await MailingList.create({
      name,
      email,
      message,
      createdAt: new Date()
    });

    console.log('✅ Mailing list entry created successfully:', newEntry.id);
    console.log('='.repeat(60));

    res.status(201).json({
      success: true,
      message: 'Registro creado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error creating mailing list entry:', error.name);
    console.error('❌ Error message:', error.message);
    console.log('='.repeat(60));

    res.status(500).json({
      success: false,
      error: 'Error al procesar la solicitud'
    });
  }
});

console.log('🔧 Mounting events routes at /api');
app.use('/api', eventsRoutes);

// PUBLIC ROUTES FOR USERSCREEN (before authentication middleware)
// Obtener una compañía específica (pública para UserScreen)
app.get('/api/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const company = await Company.findByPk(id, {
      include: [{
        model: Branch,
        attributes: ['id']
      }]
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const formattedCompany = {
      ...company.toJSON(),
      branchIds: company.Branches.map(branch => branch.id)
    };

    res.json(formattedCompany);
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ruta para obtener una sucursal específica (pública para UserScreen)
app.get('/api/branches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findByPk(id, {
      include: [{
        model: Table,
        attributes: ['id']
      }]
    });

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    const formattedBranch = {
      ...branch.toJSON(),
      tableIds: branch.Tables.map(table => table.id)
    };

    res.json(formattedBranch);
  } catch (error) {
    console.error('Error fetching branch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ruta para obtener una mesa específica (pública para UserScreen)
app.get('/api/tables/:id', async (req, res) => {
  console.log('TABLE GET API - Fetching table:', req.params.id);
  try {
    const { id } = req.params;
    
    // Check if user is authenticated by looking for authorization header
    const isAuthenticated = req.headers.authorization && req.headers.authorization.startsWith('Bearer ');
    console.log('Request is authenticated:', isAuthenticated);
    
    const table = await Table.findByPk(id, {
      include: [{
        model: Branch,
        include: [{ model: Company }]
      }]
    });

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Get effective event types for this table
    const EventConfigService = require('./src/services/eventConfig');
    
    // Get all events (including system events) to find SCAN event
    const allEvents = await EventConfigService.getEffectiveEventsForResource(
      'location',
      parseInt(id),
      table.Branch.Company.id,
      table.Branch.id,
      true // Include system events
    );

    console.log('📋 allEvents returned from getEffectiveEventsForResource:', allEvents.length);
    console.log('📋 allEvents details:', allEvents.map(e => ({
      id: e.id,
      eventName: e.eventName,
      userColor: e.userColor,
      userFontColor: e.userFontColor,
      userIcon: e.userIcon,
      systemEventType: e.systemEventType
    })));

    // Filter to only customer-visible events (exclude system events)
    const customerEvents = allEvents.filter(event =>
      !event.systemEventType && event.enabled !== false
    );

    console.log('📋 customerEvents after filtering:', customerEvents.length);
    console.log('📋 customerEvents details:', customerEvents.map(e => ({
      id: e.id,
      eventName: e.eventName,
      userColor: e.userColor,
      userFontColor: e.userFontColor,
      userIcon: e.userIcon
    })));

    // Get scan event configuration
    const scanEvent = allEvents.find(event => 
      event.systemEventType === 'SCAN'
    );
    console.log('SCAN event found in table API:', scanEvent ? 'YES' : 'NO');
    if (scanEvent) {
      console.log('SCAN event details:', scanEvent);
    }
    
    const scanEventConfig = scanEvent ? {
      eventName: scanEvent.eventName || 'Página Escaneada',
      eventColor: scanEvent.userColor || '#28a745',
      fontColor: scanEvent.userFontColor || '#ffffff'
    } : null;
    
    console.log('scanEventConfig being returned:', scanEventConfig);

    const response = {
      ...table.toJSON(),
      availableEventTypes: customerEvents,
      scanEvent: scanEventConfig
    };

    // Only include events array if user is authenticated (admin users)
    if (isAuthenticated) {
      // For authenticated users, include the events array with full event data
      const tableWithEvents = await Table.findByPk(id, {
        include: [{
          model: Event,
          as: 'events',
          include: [{
            model: require('./src/models').EventType,
            as: 'eventType',
            attributes: ['id', 'eventName', 'stateName', 'userColor', 'adminColor', 'priority']
          }],
          attributes: ['id', 'type', 'message', 'createdAt', 'seenAt', 'eventTypeId'],
        }, {
          model: Branch,
          include: [{ model: Company }]
        }],
        order: [['events', 'createdAt', 'DESC']]
      });
      
      if (tableWithEvents) {
        response.events = tableWithEvents.events || [];
      }
    }
    // For unauthenticated users (customers), events array is not included (private data)

    console.log('Full API response includes scanEvent:', 'scanEvent' in response);
    console.log('Full API response includes events:', 'events' in response);
    res.json(response);
  } catch (error) {
    console.error('Error fetching table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ruta para crear un nuevo evento (pública para UserScreen) - SYSTEM AND CUSTOM EVENTS
app.post('/api/tables/:id/events', async (req, res) => {
  console.log(req.params);
  try {
    const { id: tableId } = req.params;
    const { type, eventTypeId, systemEventType, message } = req.body;
    const currentTime = new Date();

    console.log(`Creating event for table ${tableId}:`, { type, eventTypeId, systemEventType, message });

    // Verificar que la mesa existe y obtener company info
    const table = await Table.findByPk(tableId, {
      include: [{
        model: Branch,
        include: [{ model: Company }]
      }]
    });

    console.log('Table found:', table ? 'YES' : 'NO');
    if (table) {
      console.log('Table structure:', {
        id: table.id,
        tableName: table.tableName,
        branchId: table.branchId,
        branch: table.Branch ? 'EXISTS' : 'NULL',
        company: table.Branch?.Company ? 'EXISTS' : 'NULL'
      });
    }

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    if (!table.Branch) {
      return res.status(500).json({ error: 'Table has no branch associated' });
    }

    if (!table.Branch.Company) {
      return res.status(500).json({ error: 'Branch has no company associated' });
    }

    const companyId = table.Branch.Company.id;
    console.log('Extracted companyId:', companyId);
    let finalEventTypeId = eventTypeId;

    // Case 1: Custom event with eventTypeId provided
    if (eventTypeId && !systemEventType && !type) {
      finalEventTypeId = eventTypeId;
    }
    // Case 2: System event with systemEventType provided (SCAN, MARK_SEEN, OCCUPY, VACATE)
    else if (systemEventType && !eventTypeId) {
      try {
        console.log(`Looking for system event: ${systemEventType} in company: ${companyId}`);
        const { EventType } = require('./src/models');

        // First, let's see what EventTypes exist
        const allEventTypes = await EventType.findAll({
          where: { companyId, isActive: true },
          attributes: ['id', 'eventName', 'systemEventType']
        });
        console.log('All EventTypes for company:', allEventTypes.map(et => et.toJSON()));

        const eventType = await EventType.findOne({
          where: {
            companyId,
            systemEventType,
            isActive: true
          }
        });

        console.log('Found eventType for systemEventType:', eventType ? eventType.toJSON() : 'null');

        if (!eventType) {
          return res.status(400).json({ error: `System event type ${systemEventType} not found for company ${companyId}` });
        }

        finalEventTypeId = eventType.id;
        console.log(`Resolved system event '${systemEventType}' to eventTypeId: ${finalEventTypeId}`);
      } catch (error) {
        console.error('Failed to resolve system event type:', error);
        return res.status(400).json({ error: `Invalid system event type: ${systemEventType}` });
      }
    }
    // Case 3: Legacy support - type string provided
    else if (type && !eventTypeId && !systemEventType) {
      try {
        const EventConfigService = require('./src/services/eventConfig');
        const eventType = await EventConfigService.findEventTypeByLegacyType(type, companyId);
        finalEventTypeId = eventType.id;
        console.log(`Resolved legacy type '${type}' to eventTypeId: ${finalEventTypeId}`);
      } catch (error) {
        console.error('Failed to resolve legacy event type:', error.message);
        return res.status(400).json({ error: `Invalid event type: ${type}` });
      }
    }

    if (!finalEventTypeId) {
      return res.status(400).json({ error: 'Either eventTypeId, systemEventType, or type is required' });
    }

    // Crear el nuevo evento
    await Event.create({
      tableId,
      eventTypeId: finalEventTypeId,
      type, // Keep for backward compatibility during migration
      message,
      createdAt: currentTime,
      seenAt: null
    });

    // Obtener la mesa actualizada con todos sus eventos
    const updatedTable = await Table.findByPk(tableId, {
      include: [{
        model: Event,
        as: 'events',
        include: [{
          model: require('./src/models').EventType,
          as: 'eventType',
          attributes: ['id', 'eventName', 'stateName', 'userColor', 'adminColor', 'priority']
        }],
        attributes: ['id', 'type', 'message', 'createdAt', 'seenAt', 'eventTypeId'],
      }],
      order: [['events', 'createdAt', 'DESC']]
    });

    console.log(`Event created successfully for table ${tableId}`, updatedTable.events?.length || 0, 'events total');
    res.json(formatTableWithEvents(updatedTable));
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// RUTA /api/mailing-list DUPLICADA ELIMINADA - Ahora está registrada al principio del archivo (línea ~57)
// antes de que se monte eventsRoutes, para evitar que sea interceptada por otros middlewares

// Mount API routes with authentication middleware
console.log('🔧 Mounting protected API routes at /api with authentication middleware');
console.log('⚠️  All routes registered AFTER this point will require authentication');
app.use('/api', authMiddleware.authenticate, apiRoutes);

// Request logging is now handled above

// Agregar esta función de utilidad después de las importaciones
const sortEventsByCreatedAt = (events) => {
  return events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// Función helper para formatear una mesa con sus eventos ordenados
const formatTableWithEvents = (table) => {
  return {
    ...table.toJSON(),
    events: sortEventsByCreatedAt(table.events || [])
  };
};

// API Routes - COMMENTED OUT: These routes are now handled by src/routes/index.js with proper authentication
// The following endpoint is COMPLETELY DISABLED to avoid conflicts with permission-filtered routes
/*
DISABLED_ENDPOINT: app.get('/api/companies', async (req, res) => {
  try {
    const companies = await Company.findAll({
      include: [{
        model: Branch,
        attributes: ['id']
      }]
    });
    
    // Transformar datos al formato anterior
    const formattedCompanies = companies.map(company => ({
      ...company.toJSON(),
      branchIds: company.Branches.map(branch => branch.id)
    }));
    
    res.json(formattedCompanies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
*/

/*
app.get('/api/branches', async (req, res) => {
  try {
    const { companyId } = req.query;
    const branches = await Branch.findAll({
      where: companyId ? { companyId } : {},
      include: [{
        model: Table,
        attributes: ['id']
      }]
    });

    // Transformar datos al formato anterior
    const formattedBranches = branches.map(branch => ({
      ...branch.toJSON(),
      tableIds: branch.Tables.map(table => table.id)
    }));

    res.json(formattedBranches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
*/

/*
app.get('/api/tables', async (req, res) => {
  try {
    const { branchId } = req.query;
    const tables = await Table.findAll({
      where: branchId ? { branchId } : {},
      include: [{
        model: Event,
        as: 'events',
        attributes: ['type', 'message', 'createdAt', 'seenAt'],
      }],
      order: [['events', 'createdAt', 'DESC']]
    });

    const formattedTables = tables.map(formatTableWithEvents);
    res.json(formattedTables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
*/

// Ruta para obtener una mesa específica - COMMENTED OUT: Handled by routes/index.js
/*
app.get('/api/tables/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching table with id:', id); // Debug log

    const table = await Table.findByPk(id, {
      attributes: ['id', 'tableName', 'branchId', 'tableDescription'],
      include: [{
        model: Event,
        as: 'events',
        attributes: ['type', 'message', 'createdAt', 'seenAt'],
      }],
      order: [['events', 'createdAt', 'DESC']]
    });

    if (!table) {
      console.log('Table not found:', id); // Debug log
      return res.status(404).json({ error: 'Table not found' });
    }

    res.json(formatTableWithEvents(table));
  } catch (error) {
    console.error('Error fetching table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
*/

// Ruta para actualizar una mesa - COMMENTED OUT: Handled by routes/index.js  
/*
app.put('/api/tables/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { events, ...tableData } = req.body;
    const currentTime = new Date();
    
    // Actualizar la mesa
    const table = await Table.findByPk(id);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    await table.update(tableData);

    // Si hay nuevos eventos, crearlos
    if (events && events.length > 0) {
      const lastEvent = events[events.length - 1];
      // Crear el nuevo evento (ya viene como visto si es MARK_AVAILABLE)
      await Event.create({
        tableId: id,
        type: lastEvent.type,
        message: lastEvent.message,
        createdAt: lastEvent.createdAt || currentTime,
        seenAt: null
      });

      // Si es un evento de liberar mesa, marcar todos los eventos como vistos
      if (lastEvent.type === EventTypes.MARK_AVAILABLE) {
        await Event.update(
          { seenAt: currentTime },
          {
            where: {
              tableId: id,
              seenAt: null
            }
          }
        );
      }
    }

    // Obtener la mesa actualizada con TODOS sus eventos
    const updatedTable = await Table.findByPk(id, {
      include: [{
        model: Event,
        as: 'events',
        attributes: ['type', 'message', 'createdAt', 'seenAt'],
      }],
      order: [['events', 'createdAt', 'DESC']]
    });

    res.json(formatTableWithEvents(updatedTable));
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
*/

// Ruta para marcar eventos como vistos
app.put('/api/tables/:id/mark-seen', authMiddleware.authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const currentTime = new Date();
    
    // Get table with branch info to determine company
    const table = await Table.findByPk(id, {
      include: [{
        model: Branch,
        include: [{ model: Company }]
      }, {
        model: Event,
        as: 'events',
        where: {
          seenAt: null
        },
        required: false
      }]
    });
    
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const companyId = table.Branch.Company.id;
    
    // Find MARK_SEEN EventType for this company
    const markSeenEventType = await EventType.findOne({
      where: {
        companyId,
        systemEventType: 'MARK_SEEN',
        isActive: true
      }
    });
    
    // Create MARK_SEEN event (system events are auto-seen)
    if (markSeenEventType) {
      await Event.create({
        tableId: id,
        eventTypeId: markSeenEventType.id,
        message: null,
        createdAt: currentTime,
        seenAt: currentTime // System events are immediately seen
      });
    } else {
      // Fallback to legacy format for backward compatibility
      await Event.create({
        tableId: id,
        type: EventTypes.MARK_SEEN,
        createdAt: currentTime,
        seenAt: currentTime
      });
    }
    
    // Mark all unseen events as seen
    await Event.update(
      { seenAt: currentTime },
      {
        where: {
          tableId: id,
          seenAt: null
        }
      }
    );
    
    // Get updated table with all events
    const updatedTable = await Table.findByPk(id, {
      include: [{
        model: Event,
        as: 'events',
        attributes: ['type', 'eventTypeId', 'message', 'createdAt', 'seenAt'],
      }],
      order: [['events', 'createdAt', 'DESC']]
    });
    
    res.json(formatTableWithEvents(updatedTable));
  } catch (error) {
    console.error('Error marking events as seen:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ruta para marcar una mesa específica como disponible
app.put('/api/tables/:id/mark-available', authMiddleware.authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const currentTime = new Date();

    // Get table with branch info to determine company
    const table = await Table.findByPk(id, {
      include: [{
        model: Branch,
        include: [{ model: Company }]
      }]
    });
    
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const companyId = table.Branch.Company.id;

    // Mark all unseen events as seen
    await Event.update(
      { seenAt: currentTime },
      {
        where: {
          tableId: id,
          seenAt: null
        }
      }
    );

    // Find VACATE EventType for this company
    const vacateEventType = await EventType.findOne({
      where: {
        companyId,
        systemEventType: 'VACATE',
        isActive: true
      }
    });

    // Create VACATE event (system events are auto-seen)
    if (vacateEventType) {
      await Event.create({
        tableId: id,
        eventTypeId: vacateEventType.id,
        message: null,
        createdAt: currentTime,
        seenAt: currentTime // System events are immediately seen
      });
    } else {
      // Fallback to legacy format for backward compatibility
      await Event.create({
        tableId: id,
        type: EventTypes.MARK_AVAILABLE,
        createdAt: currentTime,
        seenAt: currentTime
      });
    }

    // Get updated table with all events
    const updatedTable = await Table.findByPk(id, {
      include: [{
        model: Event,
        as: 'events',
        attributes: ['type', 'eventTypeId', 'message', 'createdAt', 'seenAt'],
      }],
      order: [['events', 'createdAt', 'DESC']]
    });

    res.json(formatTableWithEvents(updatedTable));
  } catch (error) {
    console.error('Error marking table as available:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ruta para marcar una mesa específica como ocupada
app.put('/api/tables/:id/mark-occupied', authMiddleware.authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const currentTime = new Date();

    // Get table with branch info to determine company
    const table = await Table.findByPk(id, {
      include: [{
        model: Branch,
        include: [{ model: Company }]
      }]
    });
    
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const companyId = table.Branch.Company.id;

    // Find OCCUPY EventType for this company
    const occupyEventType = await EventType.findOne({
      where: {
        companyId,
        systemEventType: 'OCCUPY',
        isActive: true
      }
    });

    // Create OCCUPY event (system events are auto-seen)
    if (occupyEventType) {
      await Event.create({
        tableId: id,
        eventTypeId: occupyEventType.id,
        message: null,
        createdAt: currentTime,
        seenAt: currentTime // System events are immediately seen
      });
    } else {
      // Fallback to legacy SCAN format for backward compatibility
      await Event.create({
        tableId: id,
        type: 'SCAN',
        createdAt: currentTime,
        seenAt: currentTime
      });
    }

    // Get updated table with all events
    const updatedTable = await Table.findByPk(id, {
      include: [{
        model: Event,
        as: 'events',
        attributes: ['type', 'eventTypeId', 'message', 'createdAt', 'seenAt'],
      }],
      order: [['events', 'createdAt', 'DESC']]
    });

    res.json(formatTableWithEvents(updatedTable));
  } catch (error) {
    console.error('Error marking table as occupied:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// RUTAS DUPLICADAS ELIMINADAS - MOVIDAS A SECCIÓN PÚBLICA ARRIBA

// Ruta para liberar todas las mesas de una sucursal
app.post('/api/branches/:id/release-all-tables', authMiddleware.authenticate, async (req, res) => {
  try {
    const { id: branchId } = req.params;
    const currentTime = new Date();

    // Obtener todas las mesas de la sucursal
    const tables = await Table.findAll({
      where: { branchId }
    });

    // Para cada mesa, crear un evento MARK_AVAILABLE y marcar todos los eventos como vistos
    await Promise.all(tables.map(async (table) => {
      // Marcar todos los eventos como vistos
      await Event.update(
        { seenAt: currentTime },
        {
          where: {
            tableId: table.id,
            seenAt: null
          }
        }
      );

      // Crear evento MARK_AVAILABLE
      await Event.create({
        tableId: table.id,
        type: EventTypes.MARK_AVAILABLE,
        createdAt: currentTime,
        seenAt: currentTime
      });
    }));

    // Obtener las mesas actualizadas
    const updatedTables = await Table.findAll({
      where: { branchId },
      include: [{
        model: Event,
        as: 'events',
        attributes: ['type', 'message', 'createdAt', 'seenAt'],
      }],
      order: [['events', 'createdAt', 'DESC']]
    });

    const formattedTables = updatedTables.map(formatTableWithEvents);
    res.json(formattedTables);
  } catch (error) {
    console.error('Error releasing all tables:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DISABLED: Duplicate POST /api/companies route - this functionality is handled by routes/index.js
// which properly creates default event types for new companies
/*
app.post('/api/companies', authMiddleware.authenticate, async (req, res) => {
  try {
    const company = await Company.create({
      ...req.body,
      branchIds: req.body.branchIds || [] // Aseguramos que branchIds esté definido
    });

    // Automatically give 'edit' permission to the user who created the company
    await Permission.create({
      userId: req.user.id,
      resourceType: 'company',
      resourceId: company.id,
      permissionLevel: 'edit'
    });

    const formattedCompany = {
      ...company.toJSON(),
      branches: [] // Inicialmente sin sucursales
    };

    res.status(201).json(formattedCompany);
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
*/

// DISABLED: Duplicate routes - these are handled by routes/index.js with proper permission checks
/*
// Rutas para Company
app.put('/api/companies/:id', authMiddleware.authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const company = await Company.findByPk(id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    await company.update(req.body);
    res.json(company);
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rutas para Branch
app.post('/api/branches', authMiddleware.authenticate, async (req, res) => {
  try {
    const branch = await Branch.create(req.body);
    res.status(201).json(branch);
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/branches/:id', authMiddleware.authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findByPk(id);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    await branch.update(req.body);
    res.json(branch);
  } catch (error) {
    console.error('Error updating branch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/branches/:id', authMiddleware.authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await Branch.findByPk(id);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    await branch.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting branch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
*/

// Ruta para crear una nueva mesa - COMMENTED OUT: Now handled by routes/index.js
/*
app.post('/api/tables', authMiddleware.authenticate, async (req, res) => {
  try {
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
        as: 'events',
        attributes: ['type', 'message', 'createdAt', 'seenAt']
      }]
    });

    res.status(201).json(formatTableWithEvents(tableWithEvents));
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
*/

// Ruta para eliminar una mesa - COMMENTED OUT: Now handled by routes/index.js
/*
app.delete('/api/tables/:id', authMiddleware.authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Primero verificar que la mesa existe
    const table = await Table.findByPk(id);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Eliminar todos los eventos asociados primero
    await Event.destroy({
      where: {
        tableId: id
      }
    });

    // Luego eliminar la mesa
    await table.destroy();
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
*/

// RUTA DUPLICADA ELIMINADA - La ruta /api/mailing-list ahora está en la sección de rutas públicas (antes del middleware de autenticación)

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'build')));

// La ruta catch-all debe ser LA ÚLTIMA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Función para crear la base de datos si no existe
async function createDatabaseIfNotExists() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1Q.2w.3e.4r.',
    database: 'heymozo_dev' // Conectamos a la base de datos por defecto
  });

  try {
    await client.connect();
    // Verificar si la base de datos existe
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'heymozo'"
    );

    if (result.rows.length === 0) {
      // La base de datos no existe, la creamos
      await client.query('CREATE DATABASE heymozo');
      console.log('Database created successfully');
    }
  } catch (error) {
    console.error('Error creating database:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Modificar la función startServer
async function startServer() {
  try {
    // Verificar la conexión
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Database tables should be created by migration script
    console.log('💡 Database tables should be created by running: npm run migrate');

    // Iniciamos el servidor
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
