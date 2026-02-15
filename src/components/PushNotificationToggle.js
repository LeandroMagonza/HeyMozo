import React from 'react';
import { FaBell, FaBellSlash, FaSpinner } from 'react-icons/fa';
import { usePushNotifications } from '../hooks/usePushNotifications';

const PushNotificationToggle = ({ branchId, style, compact = false }) => {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    error,
    toggleSubscription
  } = usePushNotifications(branchId);

  if (!isSupported) {
    return null;
  }

  const getTooltip = () => {
    if (isLoading) return 'Cargando...';
    if (permission === 'denied') return 'Notificaciones bloqueadas en el navegador';
    if (isSubscribed) return 'Notificaciones push activadas - click para desactivar';
    return 'Activar notificaciones push';
  };

  const handleClick = async () => {
    if (permission === 'denied') {
      alert('Las notificaciones están bloqueadas en tu navegador.\n\nPara habilitarlas, hace click en el ícono de candado en la barra de direcciones y permití las notificaciones.');
      return;
    }
    await toggleSubscription();
  };

  // Compact mode: just a bell icon (for headers)
  if (compact) {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        title={getTooltip()}
        style={{
          background: 'none',
          border: 'none',
          cursor: isLoading ? 'wait' : 'pointer',
          color: isSubscribed ? '#ffc107' : '#6c757d',
          fontSize: '1.2rem',
          padding: '6px',
          display: 'flex',
          alignItems: 'center',
          borderRadius: '8px',
          transition: 'all 0.2s ease',
          ...style
        }}
      >
        {isLoading ? (
          <FaSpinner className="fa-spin" style={{ animation: 'spin 1s linear infinite' }} />
        ) : isSubscribed ? (
          <FaBell />
        ) : (
          <FaBellSlash />
        )}
      </button>
    );
  }

  // Full mode: card-style toggle for settings screen
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #dee2e6',
      ...style
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '1.4rem', color: isSubscribed ? '#ffc107' : '#6c757d' }}>
          {isSubscribed ? <FaBell /> : <FaBellSlash />}
        </span>
        <div>
          <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#212529' }}>
            Notificaciones Push
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '2px' }}>
            {permission === 'denied'
              ? 'Bloqueadas en el navegador'
              : isSubscribed
                ? 'Recibís alertas cuando hay nuevos eventos'
                : 'Activá para recibir alertas en tiempo real'}
          </div>
        </div>
      </div>
      <button
        onClick={handleClick}
        disabled={isLoading}
        title={getTooltip()}
        style={{
          background: isSubscribed ? '#ffc107' : '#dee2e6',
          border: 'none',
          cursor: isLoading ? 'wait' : 'pointer',
          width: '50px',
          height: '28px',
          borderRadius: '14px',
          position: 'relative',
          transition: 'background 0.2s ease',
          flexShrink: 0
        }}
      >
        {isLoading ? (
          <FaSpinner style={{
            animation: 'spin 1s linear infinite',
            color: '#fff',
            fontSize: '0.8rem'
          }} />
        ) : (
          <span style={{
            position: 'absolute',
            top: '3px',
            left: isSubscribed ? '25px' : '3px',
            width: '22px',
            height: '22px',
            background: '#fff',
            borderRadius: '50%',
            transition: 'left 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }} />
        )}
      </button>
      {error && (
        <span style={{ color: '#dc3545', fontSize: '0.75rem', marginLeft: '8px' }}>
          {error}
        </span>
      )}
    </div>
  );
};

export default PushNotificationToggle;
