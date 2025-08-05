const sequelize = require('../config/database');

// Load all models and their relationships
console.log('📦 Loading models and relationships...');
require('../models/index');
console.log('✅ Models and relationships loaded');

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');
    console.log('Environment:', process.env.NODE_ENV);
    
    // En producción, usar alter: true para no perder datos
    // En desarrollo, usar force: true para recrear tablas
    const isProduction = process.env.NODE_ENV === 'production';
    const syncOptions = isProduction 
      ? { alter: true }  // Actualiza estructura sin perder datos
      : { force: true }; // Recrea tablas completamente
    
    console.log('Sync options:', syncOptions);
    
    // Test database connection first
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Sincronizar todos los modelos
    await sequelize.sync(syncOptions);
    
    console.log('✅ Database tables synchronized successfully');
    
    if (isProduction) {
      console.log('📊 Production migration completed - existing data preserved');
    } else {
      console.log('🔄 Development migration completed - tables recreated');
    }
    
  } catch (error) {
    console.error('❌ Error during database migration:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

migrate(); 