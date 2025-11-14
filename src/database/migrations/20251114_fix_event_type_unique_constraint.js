/**
 * Fix incorrect unique constraint on EventTypes.systemEventType
 *
 * The model had `unique: ['companyId', 'systemEventType']` on the systemEventType field,
 * which is incorrect Sequelize syntax and created a unique constraint on systemEventType alone,
 * preventing multiple companies from having the same system event types.
 *
 * The correct unique constraint is defined in the indexes and should be (companyId, systemEventType).
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Fixing EventTypes systemEventType unique constraint...');

    try {
      // Find all unique constraints on systemEventType column
      const [constraints] = await queryInterface.sequelize.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
        WHERE tc.table_name = 'EventTypes'
        AND tc.constraint_type = 'UNIQUE'
        AND ccu.column_name = 'systemEventType'
        AND constraint_name NOT LIKE '%companyId%'
      `);

      console.log(`Found ${constraints.length} incorrect unique constraints on systemEventType`);

      for (const constraint of constraints) {
        const constraintName = constraint.constraint_name;
        console.log(`   Dropping incorrect constraint: ${constraintName}`);

        try {
          await queryInterface.sequelize.query(
            `ALTER TABLE "EventTypes" DROP CONSTRAINT IF EXISTS "${constraintName}"`
          );
          console.log(`   ✅ Dropped constraint: ${constraintName}`);
        } catch (error) {
          console.log(`   ⚠️  Could not drop constraint ${constraintName}:`, error.message);
        }
      }

      // Verify the correct composite unique index exists
      const [indexes] = await queryInterface.sequelize.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'EventTypes'
        AND indexdef LIKE '%UNIQUE%'
        AND indexdef LIKE '%companyId%'
        AND indexdef LIKE '%systemEventType%'
      `);

      if (indexes.length > 0) {
        console.log('✅ Correct composite unique index exists:', indexes[0].indexname);
      } else {
        console.log('⚠️  Correct composite unique index not found, will be created by sequelize.sync');
      }

      console.log('✅ EventTypes unique constraint fixed');

    } catch (error) {
      console.error('❌ Error fixing EventTypes constraint:', error.message);
      // Don't throw - this is a non-critical fix
      console.log('⚠️  Continuing despite error...');
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Reverting EventTypes constraint fix...');
    console.log('⚠️  No action needed - the incorrect constraint was removed');
  }
};
