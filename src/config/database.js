const { Sequelize } = require('sequelize');
const config = require('./config');

const environment = process.env.NODE_ENV || 'development';
const dbConfig = config[environment];

let sequelize;

if (environment === 'production') {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: dbConfig.dialectOptions,
    logging: false
  });
} else {
  sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      port: dbConfig.port,
      dialect: dbConfig.dialect,
      dialectOptions: dbConfig.dialectOptions,
      logging: false
    }
  );
}

module.exports = sequelize; 