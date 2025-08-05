const { Sequelize } = require('sequelize');

const environment = process.env.NODE_ENV || 'development';

let sequelize;

if (environment === 'production') {
  // Production: use DATABASE_URL with SSL
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  });
} else {
  // Development: use individual connection parameters or fallback DATABASE_URL
  const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:1Q.2w.3e.4r.@localhost:5432/heymozo';
  
  sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: false
    },
    logging: false
  });
}

module.exports = sequelize;