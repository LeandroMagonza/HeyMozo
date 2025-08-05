const { User, Permission, AuthToken, Table, Branch } = require('../models');
const emailService = require('./email');
const { Op } = require('sequelize');

/**
 * Request a login token for a user
 * @param {string} email - User's email address
 * @param {string} loginBaseUrl - Base URL for login
 * @returns {Promise<Object>} - Result of the operation
 */
const requestLoginToken = async (email, loginBaseUrl) => {
  console.log('🔐 requestLoginToken called with:', { email, loginBaseUrl });
  
  // Email validation
  if (!email || !email.includes('@')) {
    console.log('❌ Invalid email format:', email);
    throw new Error('Valid email address is required');
  }

  try {
    console.log('👤 Checking if user exists...');
    // Check if the user exists
    let user = await User.findOne({ where: { email } });
    console.log('👤 User found:', user ? `ID: ${user.id}` : 'No user found');
    
    console.log('🎫 Generating auth token...');
    // Generate a new token
    const authToken = await AuthToken.generateToken(email, user?.id);
    console.log('🎫 Auth token generated:', {
      id: authToken.id,
      token: authToken.token.substring(0, 8) + '...',
      expiresAt: authToken.expiresAt
    });
    
    console.log('📧 Sending login email...');
    // Send login email
    await emailService.sendLoginLink(
      email, 
      authToken.token, 
      loginBaseUrl
    );
    console.log('📧 Email service completed');
    
    console.log('✅ requestLoginToken completed successfully');
    return {
      success: true,
      message: 'Login link sent to email'
    };
  } catch (error) {
    console.error('❌ Error in requestLoginToken:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
};

/**
 * Verify a login token and authenticate the user
 * @param {string} token - The login token
 * @returns {Promise<Object>} - User data and permissions if successful
 */
const verifyLoginToken = async (token) => {
  if (!token) {
    throw new Error('Token is required');
  }

  try {
    console.log('🔍 Verifying token:', token);
    
    // Debug: Check if token exists at all
    const anyToken = await AuthToken.findOne({
      where: { token }
    });
    
    if (!anyToken) {
  
      throw new Error('Invalid or expired token');
    }
    


    // Find the token
    const authToken = await AuthToken.findOne({
      where: {
        token,
        used: false,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!authToken) {

      throw new Error('Invalid or expired token');
    }

    // Get or create the user
    let user = await User.findOne({ where: { email: authToken.email } });
    
    if (!user) {
      // Create new user
      user = await User.create({
        email: authToken.email,
        lastLogin: new Date()
      });
    } else {
      // Update last login time
      user.lastLogin = new Date();
      await user.save();
    }

    // Mark token as used
    authToken.used = true;
    await authToken.save();

    // Get user's permissions
    const permissions = await Permission.findAll({
      where: { userId: user.id }
    });

    // Format permissions for client
    const formattedPermissions = permissions.map(p => ({
      resourceType: p.resourceType,
      resourceId: p.resourceId,
      permissionLevel: p.permissionLevel
    }));

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin
      },
      permissions: formattedPermissions
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    throw error;
  }
};

/**
 * Check if a user has permission for a specific resource
 * @param {number} userId - User ID
 * @param {string} resourceType - Type of resource ('company', 'branch', 'table')
 * @param {number} resourceId - ID of the resource
 * @returns {Promise<boolean>} - Whether the user has permission
 */
const hasPermission = async (userId, resourceType, resourceId) => {
  try {
    // Check if user is admin
    const user = await User.findByPk(userId);
    if (user?.isAdmin) {
      return true;  // Admins have access to everything
    }

    // Find direct permission
    const directPermission = await Permission.findOne({
      where: {
        userId,
        resourceType,
        resourceId
      }
    });

    if (directPermission) {
      return true;
    }

    // For tables and branches, we need to check parent permissions
    if (resourceType === 'table') {
      // Check if user has permission for the branch that contains this table
      const table = await Table.findByPk(resourceId);
      if (table) {
        const branchPermission = await Permission.findOne({
          where: {
            userId,
            resourceType: 'branch',
            resourceId: table.branchId
          }
        });
        
        if (branchPermission) {
          return true;
        }

        // Check company permission for the branch's company
        const branch = await Branch.findByPk(table.branchId);
        if (branch) {
          const companyPermission = await Permission.findOne({
            where: {
              userId,
              resourceType: 'company',
              resourceId: branch.companyId
            }
          });
          
          return !!companyPermission;
        }
      }
    } else if (resourceType === 'branch') {
      // Check if user has permission for the company that contains this branch
      const branch = await Branch.findByPk(resourceId);
      if (branch) {
        const companyPermission = await Permission.findOne({
          where: {
            userId,
            resourceType: 'company',
            resourceId: branch.companyId
          }
        });
        
        return !!companyPermission;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

/**
 * Add a permission for a user
 * @param {number} userId - User ID
 * @param {string} resourceType - Type of resource
 * @param {number} resourceId - Resource ID
 * @param {string} permissionLevel - Permission level ('view' or 'edit')
 * @returns {Promise<Object>} - The created permission
 */
const addPermission = async (userId, resourceType, resourceId, permissionLevel = 'view') => {
  try {
    // Check if permission already exists
    const existingPermission = await Permission.findOne({
      where: { userId, resourceType, resourceId }
    });

    if (existingPermission) {
      // Update permission level if different
      if (existingPermission.permissionLevel !== permissionLevel) {
        existingPermission.permissionLevel = permissionLevel;
        await existingPermission.save();
      }
      return existingPermission;
    }

    // Create new permission
    return await Permission.create({ userId, resourceType, resourceId, permissionLevel });
  } catch (error) {
    console.error('Error adding permission:', error);
    throw error;
  }
};

/**
 * Remove a permission from a user
 * @param {number} userId - User ID
 * @param {string} resourceType - Type of resource
 * @param {number} resourceId - Resource ID
 * @returns {Promise<boolean>} - Whether the operation was successful
 */
const removePermission = async (userId, resourceType, resourceId) => {
  try {
    const result = await Permission.destroy({
      where: { userId, resourceType, resourceId }
    });
    
    return result > 0;
  } catch (error) {
    console.error('Error removing permission:', error);
    throw error;
  }
};

module.exports = {
  requestLoginToken,
  verifyLoginToken,
  hasPermission,
  addPermission,
  removePermission
}; 