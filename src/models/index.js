const sequelize = require('../config/database');

// Import existing models
const User = require('./User');
const Permission = require('./Permission');
const AuthToken = require('./AuthToken');
const Company = require('./Company');
const Branch = require('./Branch');
const Table = require('./Table');
const MailingList = require('./MailingList');
const Category = require('./Category');
const MenuItem = require('./MenuItem');

// Import new model factories
const eventTypeFactory = require('./EventType');
const eventConfigurationFactory = require('./EventConfiguration');
const eventFactory = require('./Event');
const deviceFactory = require('./Device');
const tableSessionFactory = require('./TableSession');
const tableSessionDeviceFactory = require('./TableSessionDevice');
const orderFactory = require('./Order');
const orderItemFactory = require('./OrderItem');

// Initialize new models
const EventType = eventTypeFactory(sequelize);
const EventConfiguration = eventConfigurationFactory(sequelize);
const Event = eventFactory(sequelize);
const Device = deviceFactory(sequelize);
const TableSession = tableSessionFactory(sequelize);
const TableSessionDevice = tableSessionDeviceFactory(sequelize);
const Order = orderFactory(sequelize);
const OrderItem = orderItemFactory(sequelize);

// Set up new model associations
const models = { User, Permission, AuthToken, Company, Branch, Table, Event, MailingList, EventType, EventConfiguration, Category, MenuItem, Device, TableSession, TableSessionDevice, Order, OrderItem };
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
Table.hasMany(TableSession, { foreignKey: 'tableId', as: 'sessions' });

// Menu associations (Sprint 2.1). Aliases en lowercase: gotcha del codebase
// (alias case-sensitive; mismatch devuelve arrays vacíos sin error).
Branch.hasMany(Category, { as: 'categories', foreignKey: 'branchId' });
Category.belongsTo(Branch, { as: 'branch', foreignKey: 'branchId' });
Category.hasMany(MenuItem, { as: 'items', foreignKey: 'categoryId' });
MenuItem.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' });

// Order associations inversas (Sprint 3.1).
// Order/OrderItem son factory y ya wirearon sus belongsTo en el loop.
// Acá completamos los hasMany del lado contrario.
MenuItem.hasMany(OrderItem, { foreignKey: 'menuItemId', as: 'orderItems' });
TableSession.hasMany(Order, { foreignKey: 'tableSessionId', as: 'orders' });
Table.hasMany(Order, { foreignKey: 'tableId', as: 'orders' });
Branch.hasMany(Order, { foreignKey: 'branchId', as: 'orders' });

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
  EventConfiguration,
  Category,
  MenuItem,
  Device,
  TableSession,
  TableSessionDevice,
  Order,
  OrderItem
};