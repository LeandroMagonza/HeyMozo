import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';
import './LoginForm.css';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Get the intended destination from location state or default to admin config
  const from = location.state?.from?.pathname || '/admin/config';

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setStatus('error');
      setMessage('Por favor ingresa tu email');
      return;
    }

    setStatus('loading');
    setMessage('Enviando enlace de acceso...');

    try {
      await authService.requestLogin(email);
      setStatus('success');
      setMessage(`¡Enlace enviado! Hemos enviado un correo con el enlace de acceso a ${email}`);
    } catch (error) {
      console.error('Error requesting login:', error);
      setStatus('error');
      
      if (error.response?.status === 404) {
        setMessage('No se encontró un usuario con ese email. Contacta al administrador.');
      } else if (error.response?.status === 429) {
        setMessage('Demasiados intentos. Espera unos minutos antes de intentar nuevamente.');
      } else {
        setMessage('Error al enviar el enlace. Intenta nuevamente.');
      }
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="login-form-page">
      <div className="login-form-container">
        <div className="login-form-header">
          <img src="/images/heymozo-logo.png" alt="HeyMozo Logo" className="login-form-logo" />
          <h1>Acceso Administrativo</h1>
          <p>Ingresa tu email para recibir un enlace de acceso</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              disabled={status === 'loading'}
            />
          </div>

          <button 
            type="submit" 
            className={`submit-button ${status === 'loading' ? 'loading' : ''}`}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
              <>
                <div className="spinner-small"></div>
                Enviando...
              </>
            ) : (
              'Enviar Enlace de Acceso'
            )}
          </button>
        </form>

        {message && (
          <div className={`message ${status}`}>
            <div className="message-content">
              {status === 'success' && <span className="success-icon">✅</span>}
              {status === 'error' && <span className="error-icon">❌</span>}
              <p>{message}</p>
            </div>
            
            {status === 'success' && (
              <div className="success-actions">
                <p className="instruction">
                  <strong>Instrucciones:</strong>
                </p>
                <ol>
                  <li>Revisa tu bandeja de entrada de correo electrónico</li>
                  <li>Si no encuentras el email, revisa tu carpeta de spam</li>
                  <li>Espera hasta 3 minutos si el correo no ha llegado</li>
                  <li>Haz clic en el enlace del correo para acceder (válido por 15 minutos)</li>
                </ol>
              </div>
            )}
          </div>
        )}

        <div className="login-form-footer">
          <button 
            onClick={handleBackToHome}
            className="back-to-home-button"
          >
            ← Volver al inicio
          </button>
          <p>© 2024 HeyMozo - Sistema de gestión para restaurantes</p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm; 