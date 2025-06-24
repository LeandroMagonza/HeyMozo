const sequelize = require('../config/database');
const Company = require('../models/Company');
const Branch = require('../models/Branch');
const Table = require('../models/Table');
const Event = require('../models/Event');
const MailingList = require('../models/MailingList');
// Auth models
const User = require('../models/User');
const Permission = require('../models/Permission');
const AuthToken = require('../models/AuthToken');

async function migrate() {
  try {
    // Forzar recreación de tablas en desarrollo
    const force = process.env.NODE_ENV !== 'production';
    
    // Sincronizar todos los modelos
    await sequelize.sync({ force });
    
    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating database tables:', error);
    process.exit(1);
  }
}

migrate(); 