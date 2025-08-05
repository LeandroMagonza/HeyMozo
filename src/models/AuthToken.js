const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const crypto = require('crypto');

const AuthToken = sequelize.define('AuthToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  token: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  paranoid: true, // Enable soft deletes
  indexes: [
    {
      fields: ['token']
    },
    {
      fields: ['email']
    }
  ]
});

// Static method to generate a new token
AuthToken.generateToken = async function(email, userId = null) {
  // Generate a random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Set expiration to 15 minutes from now
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);
  

  
  // Create and return the token
  const createdToken = await this.create({
    email,
    userId,
    token,
    expiresAt,
    used: false
  });
  
  console.log('✅ Token saved to database:', {
    id: createdToken.id,
    email: createdToken.email,
    token: createdToken.token,
    expiresAt: createdToken.expiresAt,
    used: createdToken.used
  });
  
  return createdToken;
};

// Method to verify if a token is valid
AuthToken.prototype.isValid = function() {
  const now = new Date();
  return !this.used && now < this.expiresAt;
};

module.exports = AuthToken; 