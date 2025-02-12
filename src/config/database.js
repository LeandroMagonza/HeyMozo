const { Sequelize } = require('sequelize');

const config = {
  development: {
    username: 'postgres',
    password: '1Q.2w.3e.4r.',
    database: 'heymozo_dev',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres'
  },
  production: {
    username: 'admin',
    password: 'EJm2AWqXhY7wojsvaiYyjQTr1Smy9xNv',
    database: 'general_fn23',
    host: 'dpg-culqollds78s73d9oo50-a',
    port: 5432,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};

const environment = process.env.NODE_ENV || 'development';
const dbConfig = config[environment];

const sequelize = new Sequelize(
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

module.exports = sequelize; 