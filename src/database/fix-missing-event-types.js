/**
 * Emergency fix script to create EventTypes for companies that don't have them
 * This should be run if the migration failed or EventTypes were accidentally deleted
 *
 * Usage: node src/database/fix-missing-event-types.js
 */

const sequelize = require('../config/database');
const { Company, EventType } = require('../models');
const EventConfigService = require('../services/eventConfig');

async function fixMissingEventTypes() {
  try {
    console.log('🔄 Starting EventTypes recovery script...');
    console.log('Environment:', process.env.NODE_ENV);

    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get all companies
    const companies = await Company.findAll({
      attributes: ['id', 'companyName']
    });

    console.log(`🏢 Found ${companies.length} companies`);

    for (const company of companies) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔍 Checking company ${company.id}: ${company.companyName}`);

      // Check if this company has EventTypes
      const existingEventTypes = await EventType.findAll({
        where: { companyId: company.id }
      });

      if (existingEventTypes.length > 0) {
        console.log(`   ✅ Company already has ${existingEventTypes.length} EventTypes`);
        continue;
      }

      // Company has no EventTypes - create them
      console.log(`   ⚠️  Company has NO EventTypes!`);
      console.log(`   🔧 Creating default EventTypes...`);

      try {
        const createdEventTypes = await EventConfigService.createDefaultEventTypes(company.id);
        console.log(`   ✅ Created ${createdEventTypes.length} EventTypes for company ${company.id}`);
      } catch (error) {
        console.error(`   ❌ Failed to create EventTypes for company ${company.id}:`, error.message);
        console.error('   Stack:', error.stack);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ EventTypes recovery script completed!');
    console.log('💡 You may need to run the migration again to link events: npm run migrate');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during recovery:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

fixMissingEventTypes();
