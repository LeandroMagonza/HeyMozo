const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Adding override fields to EventConfigurations table...');

    try {
      // Add override fields to EventConfigurations table
      await queryInterface.addColumn('EventConfigurations', 'eventName', {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 100]
        }
      });

      await queryInterface.addColumn('EventConfigurations', 'stateName', {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 100]
        }
      });

      await queryInterface.addColumn('EventConfigurations', 'userColor', {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
        }
      });

      await queryInterface.addColumn('EventConfigurations', 'userFontColor', {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
        }
      });

      await queryInterface.addColumn('EventConfigurations', 'userIcon', {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [2, 50]
        }
      });

      await queryInterface.addColumn('EventConfigurations', 'adminColor', {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
        }
      });

      await queryInterface.addColumn('EventConfigurations', 'priority', {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
          max: 100
        }
      });

      console.log('✅ Override fields added to EventConfigurations table');

    } catch (error) {
      console.error('❌ Error adding override fields:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Removing override fields from EventConfigurations table...');

    try {
      // Remove override fields from EventConfigurations table
      await queryInterface.removeColumn('EventConfigurations', 'eventName');
      await queryInterface.removeColumn('EventConfigurations', 'stateName');
      await queryInterface.removeColumn('EventConfigurations', 'userColor');
      await queryInterface.removeColumn('EventConfigurations', 'userFontColor');
      await queryInterface.removeColumn('EventConfigurations', 'userIcon');
      await queryInterface.removeColumn('EventConfigurations', 'adminColor');
      await queryInterface.removeColumn('EventConfigurations', 'priority');

      console.log('✅ Override fields removed from EventConfigurations table');

    } catch (error) {
      console.error('❌ Error removing override fields:', error);
      throw error;
    }
  }
};