# Plan de Implementación: Notificaciones Push (PWA)

## Resumen

Implementar notificaciones push en tiempo real para alertar al personal cuando una mesa requiere atención, usando Web Push API (PWA) sin necesidad de una aplicación móvil nativa.

## Arquitectura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Cliente   │────▶│   Backend   │────▶│  Web Push   │────▶│   Mozo      │
│  (Mesa QR)  │     │  (Node.js)  │     │   Service   │     │  (PWA)      │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                    │                                       │
      │  POST /event       │  webpush.send()                      │
      │  "Llamar Mozo"     │  (instantáneo)                       │
      └────────────────────┴───────────────────────────────────────┘
```

## Compatibilidad

| Plataforma | Soporte | Notas |
|------------|---------|-------|
| Android Chrome | ✅ Completo | Funciona con navegador cerrado |
| iOS Safari 16.4+ | ✅ Con PWA instalada | Usuario debe agregar a pantalla de inicio |
| Desktop (Chrome/Firefox/Edge) | ✅ Completo | Funciona con navegador cerrado |
| iOS Safari (sin instalar) | ❌ No soportado | Limitación de Apple |

## Fases de Implementación

---

### Fase 1: Configuración Base PWA

#### 1.1 Crear/Actualizar Web App Manifest

**Archivo:** `public/manifest.json`

```json
{
  "name": "HeyMozo - Gestión de Restaurantes",
  "short_name": "HeyMozo",
  "description": "Sistema de gestión para restaurantes",
  "start_url": "/admin",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#FF6B35",
  "icons": [
    {
      "src": "/logo192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/logo512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

#### 1.2 Crear Service Worker

**Archivo:** `public/sw.js`

```javascript
// Service Worker para HeyMozo Push Notifications

self.addEventListener('install', (event) => {
  console.log('[SW] Instalado');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activado');
  event.waitUntil(clients.claim());
});

// Recibir notificaciones push
self.addEventListener('push', (event) => {
  console.log('[SW] Push recibido:', event);

  let data = {
    title: 'HeyMozo',
    body: 'Nueva solicitud de mesa',
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: {}
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200],
    tag: data.tag || 'heymozo-notification',
    renotify: true,
    requireInteraction: true,
    data: data.data,
    actions: [
      { action: 'view', title: 'Ver mesa' },
      { action: 'dismiss', title: 'Descartar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Manejar clic en notificación
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificación clickeada:', event.action);
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/admin';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if (client.url.includes('/admin') && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
```

#### 1.3 Registrar Service Worker en React

**Archivo:** `src/serviceWorkerRegistration.js` (crear o actualizar)

```javascript
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers no soportados');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registrado:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Error registrando Service Worker:', error);
    return null;
  }
}

export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.unregister();
  }
}
```

---

### Fase 2: Backend - Configuración Web Push

#### 2.1 Instalar Dependencias

```bash
npm install web-push
```

#### 2.2 Generar VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Guardar en `.env`:
```env
VAPID_PUBLIC_KEY=BEl62iUYgU...
VAPID_PRIVATE_KEY=UUxI4O8k...
VAPID_EMAIL=mailto:admin@heymozo.com
```

#### 2.3 Crear Modelo PushSubscription

**Archivo:** `src/models/PushSubscription.js`

```javascript
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PushSubscription = sequelize.define('PushSubscription', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Branches',
        key: 'id'
      },
      comment: 'Si es null, recibe notificaciones de todas las sucursales con permiso'
    },
    endpoint: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true
    },
    keys: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Contiene p256dh y auth keys'
    },
    userAgent: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastUsed: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'PushSubscriptions',
    timestamps: true
  });

  PushSubscription.associate = (models) => {
    PushSubscription.belongsTo(models.User, { foreignKey: 'userId' });
    PushSubscription.belongsTo(models.Branch, { foreignKey: 'branchId' });
  };

  return PushSubscription;
};
```

#### 2.4 Crear Servicio de Push Notifications

**Archivo:** `src/services/pushNotifications.js`

```javascript
const webpush = require('web-push');

// Configurar VAPID
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@heymozo.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Envía una notificación push a una suscripción específica
 */
async function sendPushNotification(subscription, payload) {
  try {
    const result = await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys
      },
      JSON.stringify(payload)
    );
    return { success: true, result };
  } catch (error) {
    console.error('Error enviando push:', error);

    // Si la suscripción expiró o es inválida, marcarla como inactiva
    if (error.statusCode === 404 || error.statusCode === 410) {
      return { success: false, expired: true, error };
    }

    return { success: false, error };
  }
}

/**
 * Notifica a todos los usuarios suscritos de una sucursal sobre un nuevo evento
 */
async function notifyBranchStaff(branchId, eventData, models) {
  const { PushSubscription, Table, Branch } = models;

  // Obtener información de la mesa y sucursal
  const table = await Table.findByPk(eventData.tableId, {
    include: [{ model: Branch }]
  });

  if (!table) {
    console.warn('Mesa no encontrada para notificación:', eventData.tableId);
    return;
  }

  // Buscar todas las suscripciones activas para esta sucursal
  const subscriptions = await PushSubscription.findAll({
    where: {
      branchId: branchId,
      isActive: true
    }
  });

  if (subscriptions.length === 0) {
    console.log('No hay suscripciones activas para la sucursal:', branchId);
    return;
  }

  const payload = {
    title: `Mesa ${table.number || table.name}`,
    body: eventData.eventName || 'Solicita atención',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: `event-${eventData.id}`,
    data: {
      tableId: table.id,
      branchId: branchId,
      eventId: eventData.id,
      url: `/admin/${table.Branch.companyId}/${branchId}`
    }
  };

  console.log(`Enviando ${subscriptions.length} notificaciones push...`);

  const results = await Promise.all(
    subscriptions.map(async (sub) => {
      const result = await sendPushNotification(sub, payload);

      // Marcar suscripciones expiradas como inactivas
      if (result.expired) {
        await sub.update({ isActive: false });
      } else if (result.success) {
        await sub.update({ lastUsed: new Date() });
      }

      return result;
    })
  );

  const successful = results.filter(r => r.success).length;
  console.log(`Notificaciones enviadas: ${successful}/${subscriptions.length}`);

  return results;
}

module.exports = {
  sendPushNotification,
  notifyBranchStaff,
  getVapidPublicKey: () => process.env.VAPID_PUBLIC_KEY
};
```

#### 2.5 Crear Rutas de Push Subscriptions

**Archivo:** `src/routes/push.js`

```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getVapidPublicKey } = require('../services/pushNotifications');

module.exports = (models) => {
  const { PushSubscription } = models;

  // Obtener VAPID public key (pública)
  router.get('/vapid-public-key', (req, res) => {
    const key = getVapidPublicKey();
    if (!key) {
      return res.status(503).json({ error: 'Push notifications no configuradas' });
    }
    res.json({ publicKey: key });
  });

  // Suscribirse a notificaciones push
  router.post('/subscribe', authenticateToken, async (req, res) => {
    try {
      const { subscription, branchId } = req.body;
      const userId = req.user.id;

      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ error: 'Suscripción inválida' });
      }

      // Buscar si ya existe una suscripción con este endpoint
      let pushSub = await PushSubscription.findOne({
        where: { endpoint: subscription.endpoint }
      });

      if (pushSub) {
        // Actualizar suscripción existente
        await pushSub.update({
          userId,
          branchId,
          keys: subscription.keys,
          isActive: true,
          userAgent: req.headers['user-agent']
        });
      } else {
        // Crear nueva suscripción
        pushSub = await PushSubscription.create({
          userId,
          branchId,
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          userAgent: req.headers['user-agent'],
          isActive: true
        });
      }

      res.json({
        success: true,
        message: 'Suscripción guardada',
        subscriptionId: pushSub.id
      });
    } catch (error) {
      console.error('Error guardando suscripción push:', error);
      res.status(500).json({ error: 'Error guardando suscripción' });
    }
  });

  // Desuscribirse de notificaciones push
  router.post('/unsubscribe', authenticateToken, async (req, res) => {
    try {
      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint requerido' });
      }

      const result = await PushSubscription.update(
        { isActive: false },
        { where: { endpoint, userId: req.user.id } }
      );

      res.json({ success: true, message: 'Suscripción desactivada' });
    } catch (error) {
      console.error('Error desactivando suscripción:', error);
      res.status(500).json({ error: 'Error desactivando suscripción' });
    }
  });

  // Obtener estado de suscripción del usuario actual
  router.get('/status', authenticateToken, async (req, res) => {
    try {
      const subscriptions = await PushSubscription.findAll({
        where: {
          userId: req.user.id,
          isActive: true
        },
        attributes: ['id', 'branchId', 'createdAt', 'lastUsed']
      });

      res.json({
        subscribed: subscriptions.length > 0,
        subscriptions
      });
    } catch (error) {
      console.error('Error obteniendo estado de suscripción:', error);
      res.status(500).json({ error: 'Error obteniendo estado' });
    }
  });

  return router;
};
```

---

### Fase 3: Integrar Push en Eventos Existentes

#### 3.1 Modificar Ruta de Creación de Eventos

En el archivo donde se crean eventos (probablemente `server.js` o `src/routes/events.js`), agregar el trigger de notificaciones:

```javascript
const { notifyBranchStaff } = require('./services/pushNotifications');

// En la ruta PUT /api/tables/:id o donde se creen eventos
app.put('/api/tables/:id', async (req, res) => {
  // ... código existente para crear evento ...

  const event = await Event.create({
    tableId: table.id,
    eventTypeId: eventType.id,
    // ... otros campos
  });

  // NUEVO: Enviar notificación push
  if (event && table.branchId) {
    // No bloquear la respuesta, ejecutar en background
    notifyBranchStaff(table.branchId, {
      id: event.id,
      tableId: table.id,
      eventName: eventType.eventName
    }, models).catch(err => {
      console.error('Error enviando notificaciones push:', err);
    });
  }

  res.json({ success: true, event });
});
```

---

### Fase 4: Frontend - Componente de Notificaciones

#### 4.1 Servicio de Push en Frontend

**Archivo:** `src/services/pushNotifications.js`

```javascript
const API_URL = process.env.REACT_APP_API_URL || '/api';

/**
 * Verifica si el navegador soporta notificaciones push
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator &&
         'PushManager' in window &&
         'Notification' in window;
}

/**
 * Verifica si es iOS y si la app está instalada como PWA
 */
export function isIOSPWA() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;
  return isIOS && isStandalone;
}

/**
 * Obtiene el estado actual de los permisos de notificación
 */
export function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default', 'granted', 'denied'
}

/**
 * Solicita permiso para notificaciones
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    throw new Error('Notificaciones no soportadas');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Obtiene la VAPID public key del servidor
 */
async function getVapidPublicKey(token) {
  const response = await fetch(`${API_URL}/push/vapid-public-key`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('No se pudo obtener VAPID key');
  }

  const data = await response.json();
  return data.publicKey;
}

/**
 * Convierte la VAPID key de base64 a Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Suscribe al usuario a notificaciones push
 */
export async function subscribeToPush(token, branchId = null) {
  if (!isPushSupported()) {
    throw new Error('Push no soportado en este navegador');
  }

  // Verificar permiso
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    throw new Error('Permiso de notificaciones denegado');
  }

  // Obtener VAPID key
  const vapidPublicKey = await getVapidPublicKey(token);

  // Obtener service worker registration
  const registration = await navigator.serviceWorker.ready;

  // Suscribirse a push
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
  });

  // Enviar suscripción al backend
  const response = await fetch(`${API_URL}/push/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      branchId
    })
  });

  if (!response.ok) {
    throw new Error('Error guardando suscripción en el servidor');
  }

  return subscription;
}

/**
 * Desuscribe al usuario de notificaciones push
 */
export async function unsubscribeFromPush(token) {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    // Notificar al backend
    await fetch(`${API_URL}/push/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint
      })
    });

    // Desuscribirse localmente
    await subscription.unsubscribe();
  }

  return true;
}

/**
 * Verifica si el usuario ya está suscrito
 */
export async function isSubscribed() {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}
```

#### 4.2 Componente UI para Activar Notificaciones

**Archivo:** `src/components/NotificationToggle.js`

```javascript
import React, { useState, useEffect } from 'react';
import {
  isPushSupported,
  isIOSPWA,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed
} from '../services/pushNotifications';
import { getToken } from '../services/auth';
import { FaBell, FaBellSlash, FaExclamationTriangle } from 'react-icons/fa';
import './NotificationToggle.css';

function NotificationToggle({ branchId }) {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    setLoading(true);

    // Verificar soporte
    if (!isPushSupported()) {
      setSupported(false);
      setLoading(false);

      // Verificar si es iOS sin PWA
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS && !isIOSPWA()) {
        setShowIOSInstructions(true);
      }
      return;
    }

    // Verificar si ya está suscrito
    const status = await isSubscribed();
    setSubscribed(status);
    setLoading(false);
  }

  async function handleToggle() {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();

      if (subscribed) {
        await unsubscribeFromPush(token);
        setSubscribed(false);
      } else {
        await subscribeToPush(token, branchId);
        setSubscribed(true);
      }
    } catch (err) {
      console.error('Error toggling notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // iOS sin PWA instalada
  if (showIOSInstructions) {
    return (
      <div className="notification-toggle ios-instructions">
        <FaExclamationTriangle className="warning-icon" />
        <div className="instructions">
          <strong>Para recibir notificaciones en iOS:</strong>
          <ol>
            <li>Toca el botón "Compartir" <span className="ios-share-icon">⎙</span></li>
            <li>Selecciona "Agregar a pantalla de inicio"</li>
            <li>Abre HeyMozo desde el ícono en tu pantalla</li>
          </ol>
        </div>
      </div>
    );
  }

  // Navegador no soportado
  if (!supported) {
    return (
      <div className="notification-toggle unsupported">
        <FaBellSlash />
        <span>Notificaciones no soportadas en este navegador</span>
      </div>
    );
  }

  // Permiso denegado
  if (getNotificationPermission() === 'denied') {
    return (
      <div className="notification-toggle denied">
        <FaBellSlash />
        <span>Notificaciones bloqueadas. Habilítalas en la configuración del navegador.</span>
      </div>
    );
  }

  return (
    <div className="notification-toggle">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`toggle-btn ${subscribed ? 'subscribed' : ''}`}
      >
        {loading ? (
          <span className="loading">Cargando...</span>
        ) : subscribed ? (
          <>
            <FaBell className="icon active" />
            <span>Notificaciones activas</span>
          </>
        ) : (
          <>
            <FaBellSlash className="icon" />
            <span>Activar notificaciones</span>
          </>
        )}
      </button>

      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default NotificationToggle;
```

#### 4.3 Estilos del Componente

**Archivo:** `src/components/NotificationToggle.css`

```css
.notification-toggle {
  margin: 1rem 0;
}

.notification-toggle .toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  background-color: #f0f0f0;
  color: #333;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.notification-toggle .toggle-btn:hover:not(:disabled) {
  background-color: #e0e0e0;
}

.notification-toggle .toggle-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.notification-toggle .toggle-btn.subscribed {
  background-color: #4CAF50;
  color: white;
}

.notification-toggle .toggle-btn.subscribed:hover:not(:disabled) {
  background-color: #45a049;
}

.notification-toggle .icon {
  font-size: 1.1rem;
}

.notification-toggle .icon.active {
  animation: ring 0.5s ease;
}

@keyframes ring {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(15deg); }
  75% { transform: rotate(-15deg); }
}

.notification-toggle .error {
  color: #f44336;
  font-size: 0.8rem;
  margin-top: 0.5rem;
}

.notification-toggle.ios-instructions {
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  padding: 1rem;
}

.notification-toggle.ios-instructions .warning-icon {
  color: #856404;
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.notification-toggle.ios-instructions ol {
  margin: 0.5rem 0 0 1.5rem;
  padding: 0;
}

.notification-toggle.ios-instructions li {
  margin: 0.25rem 0;
}

.notification-toggle.unsupported,
.notification-toggle.denied {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: #f5f5f5;
  border-radius: 8px;
  color: #666;
  font-size: 0.85rem;
}
```

---

### Fase 5: Integración Final

#### 5.1 Registrar Service Worker en App.js

```javascript
// src/App.js
import { useEffect } from 'react';
import { registerServiceWorker } from './serviceWorkerRegistration';

function App() {
  useEffect(() => {
    // Registrar service worker al cargar la app
    registerServiceWorker();
  }, []);

  // ... resto del componente
}
```

#### 5.2 Agregar NotificationToggle al AdminScreen

```javascript
// En AdminScreen.js o en el layout de admin
import NotificationToggle from './NotificationToggle';

function AdminScreen({ branchId }) {
  return (
    <div className="admin-screen">
      <header>
        {/* ... */}
        <NotificationToggle branchId={branchId} />
      </header>
      {/* ... */}
    </div>
  );
}
```

#### 5.3 Registrar Rutas en server.js

```javascript
// server.js
const pushRoutes = require('./src/routes/push');

// ... después de inicializar models
app.use('/api/push', pushRoutes(models));
```

---

## Variables de Entorno Requeridas

Agregar a `.env.development` y `.env.production`:

```env
# Web Push (VAPID)
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_EMAIL=mailto:admin@heymozo.com
```

---

## Migración de Base de Datos

Crear archivo: `src/database/migrations/YYYYMMDD_add_push_subscriptions.js`

```javascript
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PushSubscriptions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Branches',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      endpoint: {
        type: Sequelize.TEXT,
        allowNull: false,
        unique: true
      },
      keys: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      userAgent: {
        type: Sequelize.STRING,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      lastUsed: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('PushSubscriptions', ['userId']);
    await queryInterface.addIndex('PushSubscriptions', ['branchId']);
    await queryInterface.addIndex('PushSubscriptions', ['isActive']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('PushSubscriptions');
  }
};
```

---

## Testing

### Test Manual

1. **Generar VAPID keys**: `npx web-push generate-vapid-keys`
2. **Configurar .env** con las keys generadas
3. **Ejecutar migración**: `npm run migrate`
4. **Iniciar servidor**: `npm run dev`
5. **Abrir en móvil** (o Chrome DevTools mobile mode)
6. **Instalar PWA** (agregar a pantalla de inicio en iOS)
7. **Login** como usuario admin
8. **Activar notificaciones** en AdminScreen
9. **Abrir otra pestaña** como cliente y crear evento
10. **Verificar** que llega la notificación

### Test con curl

```bash
# Enviar notificación de prueba (requiere implementar endpoint de test)
curl -X POST http://localhost:3001/api/push/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"branchId": "uuid-here"}'
```

---

## Consideraciones de Producción

1. **HTTPS obligatorio**: Web Push solo funciona con HTTPS (ya cubierto en Render)
2. **Limpieza de suscripciones**: Implementar job para limpiar suscripciones inactivas
3. **Rate limiting**: Considerar límites para evitar spam de notificaciones
4. **Agrupación**: Agrupar múltiples eventos en una sola notificación si llegan muy seguidos
5. **Preferencias de usuario**: Permitir configurar qué tipos de eventos notificar

---

## Recursos

- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [web-push npm package](https://github.com/web-push-libs/web-push)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [iOS PWA Support](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
