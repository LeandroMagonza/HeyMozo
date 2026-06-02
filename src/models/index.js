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
const paymentFactory = require('./Payment');
const reviewFactory = require('./Review');
const reviewTagFactory = require('./ReviewTag');
const reviewTagAssignmentFactory = require('./ReviewTagAssignment');
const clubMemberFactory = require('./ClubMember');
const clubVisitFactory = require('./ClubVisit');
const voucherFactory = require('./Voucher');
const clubMemberDeviceFactory = require('./ClubMemberDevice');

// Initialize new models
const EventType = eventTypeFactory(sequelize);
const EventConfiguration = eventConfigurationFactory(sequelize);
const Event = eventFactory(sequelize);
const Device = deviceFactory(sequelize);
const TableSession = tableSessionFactory(sequelize);
const TableSessionDevice = tableSessionDeviceFactory(sequelize);
const Order = orderFactory(sequelize);
const OrderItem = orderItemFactory(sequelize);
const Payment = paymentFactory(sequelize);
const Review = reviewFactory(sequelize);
const ReviewTag = reviewTagFactory(sequelize);
const ReviewTagAssignment = reviewTagAssignmentFactory(sequelize);
const ClubMember = clubMemberFactory(sequelize);
const ClubVisit = clubVisitFactory(sequelize);
const Voucher = voucherFactory(sequelize);
const ClubMemberDevice = clubMemberDeviceFactory(sequelize);

// Set up new model associations
const models = {
  User, Permission, AuthToken, Company, Branch, Table, Event, MailingList,
  EventType, EventConfiguration, Category, MenuItem,
  Device, TableSession, TableSessionDevice, Order, OrderItem,
  Payment, Review, ReviewTag, ReviewTagAssignment,
  ClubMember, ClubVisit, Voucher, ClubMemberDevice
};
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

// Sprint 5.2: Payment / Review / Club VIP — hasMany inversos del lado contrario.
// Los belongsTo se wireron en cada factory.associate vía el loop de arriba.
TableSession.hasMany(Payment, { foreignKey: 'tableSessionId', as: 'payments' });
TableSession.hasMany(Review, { foreignKey: 'tableSessionId', as: 'reviews' });
Branch.hasMany(ReviewTag, { foreignKey: 'branchId', as: 'reviewTags' });
Branch.hasMany(ClubMember, { foreignKey: 'branchId', as: 'clubMembers' });

// Sprint 5.11: link device ↔ member para detección de voucher al escanear.
ClubMember.hasMany(ClubMemberDevice, { foreignKey: 'clubMemberId', as: 'deviceLinks' });
Device.hasMany(ClubMemberDevice, { foreignKey: 'deviceId', as: 'clubLinks' });

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
  OrderItem,
  Payment,
  Review,
  ReviewTag,
  ReviewTagAssignment,
  ClubMember,
  ClubVisit,
  Voucher,
  ClubMemberDevice
};