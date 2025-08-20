const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = {
  // Success operations
  info: (message, data = null) => {
    if (isDevelopment) {
      console.log(`✅ ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  },
  
  // Warnings - things that might be issues but not errors
  warn: (message, data = null) => {
    console.warn(`⚠️  ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  
  // Actual errors
  error: (message, error = null) => {
    console.error(`❌ ${message}`);
    if (error) {
      if (isDevelopment) {
        // In development, show more detail
        console.error('Error details:', error.message);
        if (error.name === 'SequelizeValidationError') {
          console.error('Validation errors:', error.errors?.map(e => e.message));
        } else if (error.name === 'SequelizeDatabaseError') {
          console.error('Database error:', error.original?.message || error.message);
        }
      } else {
        // In production, just log the message
        console.error(error.message);
      }
    }
  },
  
  // API requests
  request: (method, path, user = null) => {
    if (isDevelopment) {
      const userInfo = user ? `(${user.email || user.id})` : '';
      console.log(`🔄 ${method} ${path} ${userInfo}`);
    }
  }
};

module.exports = logger;