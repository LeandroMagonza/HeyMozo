module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'lastLogout', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'lastLogin'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'lastLogout');
  }
}; 