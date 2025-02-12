// server.js

const express = require('express');
const path = require('path');
const cors = require('cors');
const sequelize = require('./src/config/database');
const Company = require('./src/models/Company');
const Branch = require('./src/models/Branch');
const Table = require('./src/models/Table');
const Event = require('./src/models/Event');
const { Op } = require('sequelize');
const { EventTypes } = require('./src/constants');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('Starting server setup');

// Middleware para parsear JSON y CORS
app.use(express.json());
app.use(cors());

// Definir relaciones
Company.hasMany(Branch, { foreignKey: 'companyId' });
Branch.belongsTo(Company, { foreignKey: 'companyId' });
Branch.hasMany(Table, { foreignKey: 'branchId' });
Table.belongsTo(Branch, { foreignKey: 'branchId' });
Table.hasMany(Event, { foreignKey: 'tableId' });
Event.belongsTo(Table, { foreignKey: 'tableId' });

// API Routes
app.get('/api/companies', async (req, res) => {
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

app.get('/api/tables', async (req, res) => {
  try {
    const { branchId } = req.query;
    const tables = await Table.findAll({
      where: branchId ? { branchId } : {},
      include: [{
        model: Event,
        attributes: ['type', 'message', 'createdAt', 'seenAt'],
        order: [['createdAt', 'DESC']]
      }]
    });

    const formattedTables = tables.map(table => ({
      ...table.toJSON(),
      events: table.Events.map(event => ({
        type: event.type,
        message: event.message,
        createdAt: event.createdAt,
        seenAt: event.seenAt
      }))
    }));

    res.json(formattedTables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ruta para obtener una mesa específica
app.get('/api/tables/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching table with id:', id); // Debug log

    const table = await Table.findByPk(id, {
      attributes: ['id', 'tableName', 'branchId', 'tableDescription'], // Especificar atributos
      include: [{
        model: Event,
        attributes: ['type', 'message', 'createdAt', 'seenAt'],
        order: [['createdAt', 'DESC']]
      }]
    });

    if (!table) {
      console.log('Table not found:', id); // Debug log
      return res.status(404).json({ error: 'Table not found' });
    }

    const formattedTable = {
      ...table.toJSON(),
      events: table.Events.map(event => ({
        type: event.type,
        message: event.message,
        createdAt: event.createdAt,
        seenAt: event.seenAt
      }))
    };

    console.log('Sending formatted table:', formattedTable); // Debug log
    res.json(formattedTable);
  } catch (error) {
    console.error('Error fetching table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ruta para actualizar una mesa
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
        attributes: ['type', 'message', 'createdAt', 'seenAt'],
        order: [['createdAt', 'DESC']]
      }]
    });

    // Formatear la respuesta y verificar que seenAt se incluye
    const formattedTable = {
      ...updatedTable.toJSON(),
      events: updatedTable.Events.map(event => {
        console.log('Event being formatted:', event.toJSON()); // Debug log
        return {
          type: event.type,
          message: event.message,
          createdAt: event.createdAt,
          seenAt: event.seenAt  // Asegurarnos que seenAt se incluye
        };
      })
    };

    console.log('Formatted table events:', formattedTable.events); // Debug log
    res.json(formattedTable);
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ruta para marcar eventos como vistos
app.put('/api/tables/:id/mark-seen', async (req, res) => {
  try {
    const { id } = req.params;
    const currentTime = new Date();

    // Primero, obtener todos los eventos no vistos de la mesa
    const table = await Table.findByPk(id, {
      include: [{
        model: Event,
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
        attributes: ['type', 'message', 'createdAt', 'seenAt'],
        order: [['createdAt', 'DESC']]
      }]
    });

    // Formatear la respuesta
    const formattedTable = {
      ...updatedTable.toJSON(),
      events: updatedTable.Events.map(event => ({
        type: event.type,
        message: event.message,
        createdAt: event.createdAt,
        seenAt: event.seenAt
      }))
    };

    res.json(formattedTable);
  } catch (error) {
    console.error('Error marking events as seen:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener una compañía específica
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

// Ruta para obtener una sucursal específica
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

// Ruta para crear un nuevo evento
app.post('/api/tables/:id/events', async (req, res) => {
  try {
    const { id: tableId } = req.params;
    const { type, message } = req.body;
    const currentTime = new Date();

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
        attributes: ['type', 'message', 'createdAt', 'seenAt'],
        order: [['createdAt', 'DESC']]
      }]
    });

    // Formatear la respuesta
    const formattedTable = {
      ...updatedTable.toJSON(),
      events: updatedTable.Events.map(event => ({
        type: event.type,
        message: event.message,
        createdAt: event.createdAt,
        seenAt: event.seenAt
      }))
    };

    res.json(formattedTable);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ruta para liberar todas las mesas de una sucursal
app.post('/api/branches/:id/release-all-tables', async (req, res) => {
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
        attributes: ['type', 'message', 'createdAt', 'seenAt'],
        order: [['createdAt', 'DESC']]
      }]
    });

    // Formatear la respuesta
    const formattedTables = updatedTables.map(table => ({
      ...table.toJSON(),
      events: table.Events.map(event => ({
        type: event.type,
        message: event.message,
        createdAt: event.createdAt,
        seenAt: event.seenAt
      }))
    }));

    res.json(formattedTables);
  } catch (error) {
    console.error('Error releasing all tables:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ruta para crear una nueva compañía
app.post('/api/companies', async (req, res) => {
  try {
    const company = await Company.create({
      ...req.body,
      branchIds: req.body.branchIds || [] // Aseguramos que branchIds esté definido
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
app.put('/api/companies/:id', async (req, res) => {
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
app.post('/api/branches', async (req, res) => {
  try {
    const branch = await Branch.create(req.body);
    res.status(201).json(branch);
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/branches/:id', async (req, res) => {
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

app.delete('/api/branches/:id', async (req, res) => {
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

// Ruta para crear una nueva mesa
app.post('/api/tables', async (req, res) => {
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
        attributes: ['type', 'message', 'createdAt', 'seenAt']
      }]
    });

    res.status(201).json(tableWithEvents);
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'build')));

// La ruta catch-all debe ser LA ÚLTIMA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Inicializar base de datos y servidor
sequelize.sync({ alter: true })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error('Unable to connect to the database:', error);
  });

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
