import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LoginPage.css';

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('Verificando tu acceso...');
  const [userInfo, setUserInfo] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [autoRedirect, setAutoRedirect] = useState(true);
  const [redirectTimer, setRedirectTimer] = useState(null);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Token no encontrado en la URL');
      return;
    }

    verifyToken(token);
  }, [searchParams]);

  const verifyToken = async (token) => {
    try {
      setStatus('verifying');
      setMessage('Verificando tu acceso...');

      // Verify the token with backend
      const response = await axios.post('/api/auth/verify-token', { token });
      
      const { user, permissions, token: jwtToken } = response.data;

      // Save JWT to localStorage
      localStorage.setItem('heymozo_token', jwtToken);
      localStorage.setItem('heymozo_user', JSON.stringify(user));
      localStorage.setItem('heymozo_permissions', JSON.stringify(permissions));

      setUserInfo(user);
      setPermissions(permissions);
      setStatus('success');
      setMessage(`¡Bienvenido, ${user.email}!`);

      // Set up auto-redirect timer
      if (autoRedirect) {
        const timer = setTimeout(() => {
          redirectUser(user, permissions);
        }, 5000); // Extended to 5 seconds
        setRedirectTimer(timer);
      }

    } catch (error) {
      console.error('Error verifying token:', error);
      setStatus('error');
      
      if (error.response?.status === 401) {
        setMessage('Token inválido o expirado. Solicita un nuevo enlace de acceso.');
      } else {
        setMessage('Error al verificar el acceso. Intenta nuevamente.');
      }
    }
  };

  const redirectUser = (user, permissions) => {
    // Admin users go to main config
    if (user.isAdmin) {
      navigate('/admin/config');
      return;
    }

    // Users with permissions go to their first available resource
    if (permissions.length > 0) {
      const firstPermission = permissions[0];
      
      if (firstPermission.resourceType === 'company') {
        navigate(`/admin/${firstPermission.resourceId}/config`);
      } else if (firstPermission.resourceType === 'branch') {
        // We need to get the company ID for this branch
        // For now, redirect to a general dashboard
        navigate('/admin/config');
      } else {
        navigate('/admin/config');
      }
    } else {
      // No permissions - redirect to create company page
      navigate('/admin/company/create');
    }
  };

  const requestNewLink = () => {
    navigate('/');
  };

  const handleManualRedirect = () => {
    if (redirectTimer) {
      clearTimeout(redirectTimer);
      setRedirectTimer(null);
    }
    redirectUser(userInfo, permissions);
  };

  const toggleAutoRedirect = () => {
    if (redirectTimer) {
      clearTimeout(redirectTimer);
      setRedirectTimer(null);
    }
    setAutoRedirect(!autoRedirect);
  };

  const formatPermissionLevel = (level) => {
    return level === 'view' ? 'Solo Lectura' : 'Lectura y Escritura';
  };

  const formatResourceType = (type) => {
    switch(type) {
      case 'company': return 'Empresa';
      case 'branch': return 'Sucursal';
      case 'table': return 'Mesa';
      default: return type;
    }
  };

  const groupPermissionsByType = (permissions) => {
    const grouped = {};
    permissions.forEach(perm => {
      if (!grouped[perm.resourceType]) {
        grouped[perm.resourceType] = [];
      }
      grouped[perm.resourceType].push(perm);
    });
    return grouped;
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [redirectTimer]);

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <img src="/images/heymozo-logo.png" alt="HeyMozo Logo" className="login-logo" />
          <h1>HeyMozo</h1>
        </div>

        <div className="login-content">
          {status === 'verifying' && (
            <div className="status-section verifying">
              <div className="spinner"></div>
              <h2>Verificando acceso</h2>
              <p>{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="status-section success">
              <div className="success-icon">✅</div>
              <h2>¡Acceso confirmado!</h2>
              <p>{message}</p>
              
              {userInfo && (
                <div className="user-info">
                  <p><strong>Email:</strong> {userInfo.email}</p>
                  {userInfo.isAdmin && <p className="admin-badge">👑 Administrador</p>}
                  
                  {/* Display permissions */}
                  <div className="permissions-section">
                    <h3>Permisos del Usuario</h3>
                    
                    {userInfo.isAdmin ? (
                      <div className="admin-permissions">
                        <p>Como administrador, tienes acceso completo a todas las funcionalidades del sistema.</p>
                      </div>
                    ) : permissions.length > 0 ? (
                      <div className="user-permissions">
                        {Object.entries(groupPermissionsByType(permissions)).map(([resourceType, perms]) => (
                          <div key={resourceType} className="permission-group">
                            <h4>{formatResourceType(resourceType)}s</h4>
                            <ul>
                              {perms.map((perm, index) => (
                                <li key={index} className="permission-item">
                                  <span className="resource-id">ID: {perm.resourceId}</span>
                                  <span className={`permission-level ${perm.permissionLevel}`}>
                                    {formatPermissionLevel(perm.permissionLevel)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-permissions">
                        <p>No tienes permisos asignados actualmente.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="redirect-controls">
                {autoRedirect && redirectTimer && (
                  <p className="redirect-message">
                    Redirigiendo automáticamente en unos segundos...
                  </p>
                )}
                
                <div className="action-buttons">
                  <button onClick={handleManualRedirect} className="continue-button">
                    Continuar al Dashboard
                  </button>
                  <button onClick={toggleAutoRedirect} className="toggle-button">
                    {autoRedirect ? 'Cancelar redirección automática' : 'Activar redirección automática'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="status-section error">
              <div className="error-icon">❌</div>
              <h2>Error de acceso</h2>
              <p>{message}</p>
              <button onClick={requestNewLink} className="retry-button">
                Solicitar nuevo enlace
              </button>
            </div>
          )}
        </div>

        <div className="login-footer">
          <p>© 2024 HeyMozo - Sistema de gestión para restaurantes</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 