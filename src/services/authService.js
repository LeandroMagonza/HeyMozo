import api from './api';

const authService = {
  // Check if user is authenticated
  isAuthenticated() {
    const token = localStorage.getItem('heymozo_token');
    const user = localStorage.getItem('heymozo_user');
    return !!(token && user);
  },

  // Get current user info
  getCurrentUser() {
    const user = localStorage.getItem('heymozo_user');
    return user ? JSON.parse(user) : null;
  },

  // Get user permissions
  getUserPermissions() {
    const permissions = localStorage.getItem('heymozo_permissions');
    return permissions ? JSON.parse(permissions) : [];
  },

  // Get JWT token
  getToken() {
    return localStorage.getItem('heymozo_token');
  },

  // Check if user is admin
  isAdmin() {
    const user = this.getCurrentUser();
    return user?.isAdmin || false;
  },

  // Check if user has permission for a specific resource
  hasPermission(resourceType, resourceId, requiredLevel = 'view') {
    const user = this.getCurrentUser();
    
    // Admins have access to everything
    if (user?.isAdmin) {
      return true;
    }

    const permissions = this.getUserPermissions();
    
    // Check direct permission
    const directPermission = permissions.find(p => 
      p.resourceType === resourceType && 
      p.resourceId === resourceId
    );

    if (directPermission) {
      if (requiredLevel === 'view') {
        return true; // Any permission level allows view
      }
      return directPermission.permissionLevel === 'edit';
    }

    // Check inherited permissions
    if (resourceType === 'branch') {
      // Check if user has company permission
      const companyPermission = permissions.find(p => 
        p.resourceType === 'company' && 
        // We need to get companyId from branchId - for now return false
        false
      );
      // TODO: Implement company inheritance logic when we have the relationship data
    }

    return false;
  },

  // Check if user can access a specific route
  async canAccessRoute(route) {
    if (!this.isAuthenticated()) {
      return { hasAccess: false, reason: 'Not authenticated' };
    }

    try {
      const response = await api.get(`/auth/check-access?route=${encodeURIComponent(route)}`);
      return response.data;
    } catch (error) {
      console.error('Error checking route access:', error);
      return { 
        hasAccess: false, 
        reason: 'Error checking permissions' 
      };
    }
  },

  // Request login token
  async requestLogin(email) {
    try {
      const response = await api.post('/auth/login-request', { email });
      return response.data;
    } catch (error) {
      console.error('Error requesting login:', error);
      throw error;
    }
  },

  // Logout (call endpoint)
  async logoutEndpoint() {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  },

  // Verify login token
  async verifyToken(token) {
    try {
      const response = await api.post('/auth/verify-token', { token });
      
      const { user, permissions, token: jwtToken } = response.data;

      // Save to localStorage
      localStorage.setItem('heymozo_token', jwtToken);
      localStorage.setItem('heymozo_user', JSON.stringify(user));
      localStorage.setItem('heymozo_permissions', JSON.stringify(permissions));

      return response.data;
    } catch (error) {
      console.error('Error verifying token:', error);
      throw error;
    }
  },

  // Get current user info from API
  async getCurrentUserFromAPI() {
    try {
      const response = await api.get('/auth/me');
      
      // Update localStorage with fresh data
      const { user, permissions } = response.data;
      localStorage.setItem('heymozo_user', JSON.stringify(user));
      localStorage.setItem('heymozo_permissions', JSON.stringify(permissions));
      
      return response.data;
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  },

  // Logout
  async logout() {
    try {
      // Optional: Call logout endpoint to log the event
      if (this.getToken()) {
        await api.post('/auth/logout').catch(error => {
          // If logout endpoint fails, continue with local logout
          console.warn('Logout endpoint failed, continuing with local logout:', error);
        });
      }
    } catch (error) {
      console.warn('Error during logout endpoint call:', error);
    }
    
    // Always clear local storage
    localStorage.removeItem('heymozo_token');
    localStorage.removeItem('heymozo_user');
    localStorage.removeItem('heymozo_permissions');
    
    // Redirect to home page
    window.location.href = '/';
  }
};

export default authService; 