import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { requestLogin, verifyLoginToken } from '../services/api';
import './LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState(null);
  const [verifying, setVerifying] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Check for token in URL on component mount
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const token = query.get('token');
    
    if (token) {
      handleTokenVerification(token);
    }
  }, [location]);

  const handleTokenVerification = async (token) => {
    setVerifying(true);
    setError(null);
    
    try {
      const response = await verifyLoginToken(token);
      
      // Save token to localStorage
      localStorage.setItem('authToken', response.data.token);
      
      // Save user info
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Redirect to home or requested page
      navigate('/');
    } catch (error) {
      console.error('Token verification failed:', error);
      setError('The login link is invalid or has expired. Please request a new one.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await requestLogin(email);
      setEmailSent(true);
    } catch (error) {
      console.error('Login request failed:', error);
      setError('Failed to send login link. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <div className="login-page">
        <div className="login-container">
          <h1>Verifying your login...</h1>
          <div className="loader"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>HeyMozo Login</h1>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {emailSent ? (
          <div className="success-message">
            <h2>Check your email</h2>
            <p>We've sent a login link to <strong>{email}</strong></p>
            <p>The link will expire in 15 minutes.</p>
            <button 
              className="app-button"
              onClick={() => setEmailSent(false)}
            >
              Send another link
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            <button 
              type="submit" 
              className="app-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Login Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage; 