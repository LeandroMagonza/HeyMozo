module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Removing unique constraint from MailingLists email column...');

    try {
      // Get all unique constraints on the MailingLists table
      const constraints = await queryInterface.sequelize.query(
        `SELECT constraint_name
         FROM information_schema.table_constraints
         WHERE table_name = 'MailingLists'
         AND constraint_type = 'UNIQUE'
         AND constraint_name LIKE '%email%'`,
        {
          type: Sequelize.QueryTypes.SELECT
        }
      );

      console.log(`Found ${constraints.length} email-related unique constraints to remove`);

      // Remove each constraint
      for (const constraint of constraints) {
        console.log(`   Dropping constraint: ${constraint.constraint_name}`);
        await queryInterface.sequelize.query(
          `ALTER TABLE "MailingLists" DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}"`
        );
      }

      console.log('✅ Unique constraint removed from MailingLists email column');
    } catch (error) {
      console.error('❌ Error removing unique constraint:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Adding back unique constraint to MailingLists email column...');

    try {
      await queryInterface.addConstraint('MailingLists', {
        fields: ['email'],
        type: 'unique',
        name: 'MailingLists_email_key'
      });

      console.log('✅ Unique constraint added back to MailingLists email column');
    } catch (error) {
      console.error('❌ Error adding unique constraint:', error.message);
      throw error;
    }
  }
};
