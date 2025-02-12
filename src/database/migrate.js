const sequelize = require('../config/database');
const Company = require('../models/Company');
const Branch = require('../models/Branch');
const Table = require('../models/Table');
const Event = require('../models/Event');

async function migrate() {
  try {
    // Forzar recreación de tablas en desarrollo
    const force = process.env.NODE_ENV !== 'production';
    
    await sequelize.sync({ force });
    
    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating database tables:', error);
    process.exit(1);
  }
}

migrate(); 