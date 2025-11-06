const fs = require('fs');
const path = require('path');
const sequelize = require('../config/database');
const { Sequelize } = require('sequelize');

async function runMigrations() {
  try {
    console.log('🔄 Starting manual migrations...');

    // Test database connection first
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort(); // Sort to ensure migrations run in order

    console.log(`📋 Found ${migrationFiles.length} migration files`);

    // Run each migration
    for (const file of migrationFiles) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔄 Running migration: ${file}`);
      console.log('='.repeat(60));

      const migration = require(path.join(migrationsDir, file));

      if (typeof migration.up === 'function') {
        await migration.up(sequelize.getQueryInterface(), Sequelize);
        console.log(`✅ Migration completed: ${file}`);
      } else {
        console.log(`⚠️ Skipping ${file} - no up() function found`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All migrations completed successfully!');
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during migrations:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

runMigrations();
