const sequelize = require('../config/database');

// Load all models and their relationships
console.log('📦 Loading models and relationships...');
require('../models/index');
console.log('✅ Models and relationships loaded');

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');
    console.log('Environment:', process.env.NODE_ENV);
    
    // Usar alter: true para preservar datos en todos los entornos
    // Solo usar force: true si explícitamente se requiere recrear
    const forceRecreate = process.env.FORCE_RECREATE === 'true';
    const syncOptions = forceRecreate 
      ? { force: true }   // Solo si se especifica explícitamente
      : { alter: true };  // Por defecto, preservar datos
    
    console.log('Sync options:', syncOptions);
    
    // Test database connection first
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Sincronizar todos los modelos con manejo de errores de índices
    try {
      await sequelize.sync(syncOptions);
    } catch (error) {
      // If it's an index already exists error, try without alter
      if (error.message?.includes('ya existe') || error.message?.includes('already exists')) {
        console.log('⚠️ Index already exists, trying sync without alter...');
        await sequelize.sync({ force: false });
      } else {
        throw error;
      }
    }
    
    console.log('✅ Database tables synchronized successfully');
    
    if (forceRecreate) {
      console.log('🔄 Migration completed - tables recreated (data lost)');
    } else {
      console.log('📊 Migration completed - existing data preserved');
    }
    
  } catch (error) {
    console.error('❌ Error during database migration:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

migrate(); 