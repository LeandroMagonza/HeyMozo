const User = require('./User');
const Permission = require('./Permission');
const AuthToken = require('./AuthToken');
const Company = require('./Company');
const Branch = require('./Branch');
const Table = require('./Table');
const Event = require('./Event');
const MailingList = require('./MailingList');

// User associations
User.hasMany(Permission, { foreignKey: 'userId' });
User.hasMany(AuthToken, { foreignKey: 'userId' });

// Permission associations
Permission.belongsTo(User, { foreignKey: 'userId' });

// AuthToken associations
AuthToken.belongsTo(User, { foreignKey: 'userId' });

// Other associations based on existing models
Company.hasMany(Branch, { foreignKey: 'companyId' });
Branch.belongsTo(Company, { foreignKey: 'companyId' });
Branch.hasMany(Table, { foreignKey: 'branchId' });
Table.belongsTo(Branch, { foreignKey: 'branchId' });
Table.hasMany(Event, { foreignKey: 'tableId', as: 'events' });
Event.belongsTo(Table, { foreignKey: 'tableId' });

module.exports = {
  User,
  Permission,
  AuthToken,
  Company,
  Branch,
  Table,
  Event,
  MailingList
}; 