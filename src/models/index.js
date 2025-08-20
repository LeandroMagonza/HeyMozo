const sequelize = require('../config/database');

// Import existing models
const User = require('./User');
const Permission = require('./Permission');
const AuthToken = require('./AuthToken');
const Company = require('./Company');
const Branch = require('./Branch');
const Table = require('./Table');
const MailingList = require('./MailingList');

// Import new model factories
const eventTypeFactory = require('./EventType');
const eventConfigurationFactory = require('./EventConfiguration');
const eventFactory = require('./Event');

// Initialize new models
const EventType = eventTypeFactory(sequelize);
const EventConfiguration = eventConfigurationFactory(sequelize);
const Event = eventFactory(sequelize);

// Set up new model associations
const models = { User, Permission, AuthToken, Company, Branch, Table, Event, MailingList, EventType, EventConfiguration };
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// User associations
User.hasMany(Permission, { foreignKey: 'userId' });
User.hasMany(AuthToken, { foreignKey: 'userId' });

// Permission associations
Permission.belongsTo(User, { foreignKey: 'userId' });

// AuthToken associations
AuthToken.belongsTo(User, { foreignKey: 'userId' });

// Other associations based on existing models
Company.hasMany(Branch, { foreignKey: 'companyId' });
Company.hasMany(EventType, { foreignKey: 'companyId' });
Branch.belongsTo(Company, { foreignKey: 'companyId' });
Branch.hasMany(Table, { foreignKey: 'branchId' });
Table.belongsTo(Branch, { foreignKey: 'branchId' });
Table.hasMany(Event, { foreignKey: 'tableId', as: 'events' });

module.exports = {
  User,
  Permission,
  AuthToken,
  Company,
  Branch,
  Table,
  Event,
  MailingList,
  EventType,
  EventConfiguration
}; 