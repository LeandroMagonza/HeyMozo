// Load environment variables based on NODE_ENV
const environment = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: `.env.${environment}` });
const express = require('express');
const path = require('path');
const cors = require('cors');
const sequelize = require('./src/config/database');
const Company = require('./src/models/Company');
const Branch = require('./src/models/Branch');
const Table = require('./src/models/Table');
const Event = require('./src/models/Event');
const Permission = require('./src/models/Permission');
const { Op } = require('sequelize');
const { EventTypes } = require('./src/constants');
const MailingList = require('./src/models/MailingList');
const { Client } = require('pg');

// Import auth routes and middleware
const authRoutes = require('./src/routes/auth');
const usersRoutes = require('./src/routes/users');
const apiRoutes = require('./src/routes/index');
const authMiddleware = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('Starting server setup');

// Middleware para parsear JSON y CORS
app.use(express.json());
app.use(cors());

// Relations are defined in src/models/index.js

// Mount auth routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

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
  try {
    const { id } = req.params;
    const table = await Table.findByPk(id, {
      include: [{
        model: Event,
        as: 'events',
        attributes: ['type', 'message', 'createdAt', 'seenAt'],
      }],
      order: [['events', 'createdAt', 'DESC']]
    });

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    res.json(formatTableWithEvents(table));
  } catch (error) {
    console.error('Error fetching table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ruta para crear un nuevo evento (pública para UserScreen)
app.post('/api/tables/:id/events', async (req, res) => {
  try {
    const { id: tableId } = req.params;
    const { type, message } = req.body;
    const currentTime = new Date();

    console.log(`Creating event for table ${tableId}:`, { type, message });

    // Verificar que la mesa existe
    const table = await Table.findByPk(tableId);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Crear el nuevo evento
    await Event.create({
      tableId,
      type,
      message,
      createdAt: currentTime,
      seenAt: null
    });

    // Obtener la mesa actualizada con todos sus eventos
    const updatedTable = await Table.findByPk(tableId, {
      include: [{
        model: Event,
        as: 'events',
        attributes: ['type', 'message', 'createdAt', 'seenAt'],
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

// Mount API routes with authentication middleware
app.use('/api', authMiddleware.authenticate, apiRoutes);

// Agregar esto después de la configuración de middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

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

    // Primero, obtener todos los eventos no vistos de la mesa
    const table = await Table.findByPk(id, {
      include: [{
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

    // Crear evento MARK_SEEN
    await Event.create({
      tableId: id,
      type: EventTypes.MARK_SEEN,
      createdAt: currentTime,
      seenAt: currentTime
    });
    
    // Marcar todos los eventos no vistos como vistos
    await Event.update(
      { seenAt: currentTime },
      {
        where: {
          tableId: id,
          seenAt: null
        }
      }
    );

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
    console.error('Error marking events as seen:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ruta para marcar una mesa específica como disponible
app.put('/api/tables/:id/mark-available', authMiddleware.authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const currentTime = new Date();

    // Verificar que la mesa existe
    const table = await Table.findByPk(id);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Marcar todos los eventos como vistos
    await Event.update(
      { seenAt: currentTime },
      {
        where: {
          tableId: id,
          seenAt: null
        }
      }
    );

    // Crear evento MARK_AVAILABLE
    await Event.create({
      tableId: id,
      type: EventTypes.MARK_AVAILABLE,
      createdAt: currentTime,
      seenAt: currentTime
    });

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
    console.error('Error marking table as available:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ruta para marcar una mesa específica como ocupada
app.put('/api/tables/:id/mark-occupied', authMiddleware.authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const currentTime = new Date();

    // Verificar que la mesa existe
    const table = await Table.findByPk(id);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Crear evento SCAN (que indica ocupación)
    await Event.create({
      tableId: id,
      type: 'SCAN',
      createdAt: currentTime,
      seenAt: currentTime
    });

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

// Ruta para crear una nueva compañía
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

// Ruta para el mailing list
app.post('/api/mailing-list', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    const newEntry = await MailingList.create({
      name,
      email,
      message,
      createdAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Registro creado exitosamente'
    });
  } catch (error) {
    console.error('Error creating mailing list entry:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al procesar la solicitud'
    });
  }
});

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
    // Solo verificar la conexión
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

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
