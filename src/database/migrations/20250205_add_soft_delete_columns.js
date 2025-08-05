const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add timestamps and deletedAt to Companies table
    await queryInterface.addColumn('Companies', 'createdAt', {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
    
    await queryInterface.addColumn('Companies', 'updatedAt', {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
    
    await queryInterface.addColumn('Companies', 'deletedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    // Add timestamps and deletedAt to Branches table
    await queryInterface.addColumn('Branches', 'createdAt', {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
    
    await queryInterface.addColumn('Branches', 'updatedAt', {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
    
    await queryInterface.addColumn('Branches', 'deletedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });

    // Add timestamps and deletedAt to Tables table
    await queryInterface.addColumn('Tables', 'createdAt', {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
    
    await queryInterface.addColumn('Tables', 'updatedAt', {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
    
    await queryInterface.addColumn('Tables', 'deletedAt', {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns from Companies table
    await queryInterface.removeColumn('Companies', 'deletedAt');
    await queryInterface.removeColumn('Companies', 'updatedAt');
    await queryInterface.removeColumn('Companies', 'createdAt');

    // Remove columns from Branches table
    await queryInterface.removeColumn('Branches', 'deletedAt');
    await queryInterface.removeColumn('Branches', 'updatedAt');
    await queryInterface.removeColumn('Branches', 'createdAt');

    // Remove columns from Tables table
    await queryInterface.removeColumn('Tables', 'deletedAt');
    await queryInterface.removeColumn('Tables', 'updatedAt');
    await queryInterface.removeColumn('Tables', 'createdAt');
  }
};