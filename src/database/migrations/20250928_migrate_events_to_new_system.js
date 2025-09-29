const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Starting migration to new event system...');

    try {
      // 1. Add eventTypeId column to Events table if it doesn't exist
      console.log('📋 Adding eventTypeId column to Events table...');
      try {
        await queryInterface.addColumn('Events', 'eventTypeId', {
          type: DataTypes.INTEGER,
          allowNull: true, // Temporarily nullable during migration
          references: {
            model: 'EventTypes',
            key: 'id'
          }
        });
        console.log('   ✅ eventTypeId column added');
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('ya existe')) {
          console.log('   ℹ️ eventTypeId column already exists');
        } else {
          throw error;
        }
      }

      // 2. Create a simple migration script that uses the existing models
      console.log('🔄 Running event migration using application models...');

      // Import the migration logic
      const EventConfigService = require('../../services/eventConfig');

      // Get all companies
      const companies = await queryInterface.sequelize.query(
        'SELECT id FROM "Companies" WHERE "deletedAt" IS NULL OR "deletedAt" IS NULL',
        {
          type: Sequelize.QueryTypes.SELECT
        }
      );

      console.log(`🏢 Found ${companies.length} companies to migrate`);

      // Create EventTypes for each company
      for (const company of companies) {
        const companyId = company.id;
        console.log(`🔄 Processing company ${companyId}...`);

        // Check if EventTypes already exist for this company
        const existingEventTypes = await queryInterface.sequelize.query(
          'SELECT id FROM "EventTypes" WHERE "companyId" = :companyId',
          {
            type: Sequelize.QueryTypes.SELECT,
            replacements: { companyId }
          }
        );

        if (existingEventTypes.length > 0) {
          console.log(`   ℹ️ Company ${companyId} already has ${existingEventTypes.length} EventTypes`);
        } else {
          try {
            await EventConfigService.createDefaultEventTypes(companyId);
            console.log(`   ✅ Created default EventTypes for company ${companyId}`);
          } catch (error) {
            console.log(`   ⚠️ Error creating EventTypes for company ${companyId}:`, error.message);
          }
        }
      }

      // 3. Migrate existing Events
      console.log('🔄 Migrating existing Events to new system...');

      const existingEvents = await queryInterface.sequelize.query(`
        SELECT e.id, e.type, e."tableId", t."branchId", b."companyId"
        FROM "Events" e
        JOIN "Tables" t ON e."tableId" = t.id
        JOIN "Branches" b ON t."branchId" = b.id
        WHERE e."eventTypeId" IS NULL AND e.type IS NOT NULL
      `, {
        type: Sequelize.QueryTypes.SELECT
      });

      console.log(`📊 Found ${existingEvents.length} events to migrate`);

      let migratedCount = 0;
      let errorCount = 0;

      for (const event of existingEvents) {
        try {
          const eventType = await EventConfigService.findEventTypeByLegacyType(event.type, event.companyId);

          await queryInterface.sequelize.query(
            'UPDATE "Events" SET "eventTypeId" = :eventTypeId WHERE id = :eventId',
            {
              type: Sequelize.QueryTypes.UPDATE,
              replacements: { eventTypeId: eventType.id, eventId: event.id }
            }
          );

          migratedCount++;
        } catch (error) {
          console.log(`⚠️ Error migrating event ${event.id} (${event.type}):`, error.message);
          errorCount++;
        }
      }

      console.log(`✅ Migration completed: ${migratedCount} events migrated, ${errorCount} errors`);
      console.log('🎉 Event system migration successful!');

    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Rolling back event system migration...');

    try {
      // Remove eventTypeId column from Events
      await queryInterface.removeColumn('Events', 'eventTypeId');

      // Note: We don't remove EventTypes and EventConfigurations tables
      // as they might be needed by the application
      console.log('⚠️ EventTypes and EventConfigurations tables preserved');
      console.log('✅ Rollback completed');

    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};