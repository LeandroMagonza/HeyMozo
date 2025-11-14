# HeyMozo - Sistema de Gestión para Restaurantes

## 📖 Descripción

HeyMozo es un sistema de gestión inteligente que optimiza la comunicación entre clientes y personal en restaurantes. Permite a los clientes solicitar atención, pedir la cuenta y acceder al menú a través de códigos QR únicos por mesa, mientras que el personal puede gestionar las solicitudes en tiempo real.

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Ejecutar migraciones de base de datos
npm run migrate

# Iniciar servidor y frontend en desarrollo
npm run dev
```

El comando `npm run dev` ejecuta concurrentemente:
- **Frontend React**: http://localhost:3000
- **Backend Node.js**: http://localhost:3001

## 🛠️ Tecnologías

### Backend
- **Node.js** con Express.js
- **PostgreSQL** como base de datos
- **Sequelize** ORM para manejo de base de datos
- **JWT** para autenticación
- **Resend API** para envío de emails (magic links)
- **CORS** para comunicación frontend-backend

### Frontend
- **React 18** con React Router DOM
- **CSS modules** para estilos
- **React Icons** para iconografía

### Base de Datos
- **PostgreSQL** con las siguientes tablas principales:
  - `Companies` - Empresas/restaurantes
  - `Branches` - Sucursales de cada empresa
  - `Tables` - Mesas de cada sucursal
  - `Events` - Eventos/solicitudes de cada mesa
  - `EventTypes` - Tipos de eventos configurables por empresa
  - `EventConfigurations` - Configuraciones jerárquicas de eventos (empresa → sucursal → mesa)
  - `Users` - Usuarios del sistema (administradores/personal)
  - `Permissions` - Permisos de acceso por usuario
  - `AuthTokens` - Tokens de autenticación temporal
  - `MailingList` - Lista de emails de contacto

## 📁 Estructura del Proyecto

```
heymozo/
├── server.js                 # Servidor principal Express
├── package.json             # Dependencias y scripts
├── src/                     # Frontend React y Backend
│   ├── App.js              # Componente principal y rutas React
│   ├── components/         # Componentes de la interfaz
│   │   ├── EventConfigModal.js    # Modal de configuración de eventos
│   │   ├── AdminScreen.js         # Dashboard de administración
│   │   ├── UserScreen.js          # Interfaz del cliente
│   │   └── ...
│   ├── services/           # Servicios API y autenticación
│   │   ├── auth.js        # Autenticación frontend
│   │   ├── email.js       # Servicio de emails
│   │   └── eventConfig.js # Lógica de configuración de eventos
│   ├── models/             # Modelos Sequelize
│   │   ├── EventType.js   # Tipos de eventos
│   │   ├── EventConfiguration.js # Configuraciones jerárquicas
│   │   └── ...
│   ├── routes/             # Rutas del backend
│   │   ├── events.js      # Rutas de eventos y configuración
│   │   ├── auth.js        # Rutas de autenticación
│   │   └── ...
│   ├── middleware/         # Middleware de autenticación
│   ├── config/             # Configuración de BD
│   └── database/           # Migraciones y seeders
└── public/                 # Archivos estáticos
```

## 🖥️ Pantallas y Funcionalidades

### Frontend (React)

#### Rutas Públicas
- **`/`** - Landing page de presentación del producto
- **`/user/:companyId/:branchId/:tableId`** - Interfaz del cliente (mesa específica)

#### Rutas de Administración (Requieren autenticación)
- **`/admin/config`** - Lista de todas las empresas (solo admins)
- **`/admin/:companyId/config`** - Configuración de empresa específica
- **`/admin/:companyId/:branchId/config`** - Configuración de sucursal específica
- **`/admin/:companyId/:branchId`** - Vista operativa de mesas en tiempo real
- **`/admin/:companyId/:branchId/urls`** - Gestión de URLs y códigos QR

#### Componentes Principales
- **AdminScreen** - Dashboard principal de administración
- **UserScreen** - Interfaz del cliente en la mesa
- **CompanyConfig** - Configuración de empresas
- **BranchConfig** - Configuración de sucursales
- **TablesList** - Lista y gestión de mesas
- **EventsList** - Lista de eventos/solicitudes en tiempo real
- **EventConfigModal** - Configuración jerárquica de eventos (v2 con overrides)
- **QRGeneratorModal** - Generador de códigos QR para mesas

### Backend (Node.js/Express)

#### Endpoints de Autenticación
- **`POST /api/auth/login-request`** - Solicitar magic link por email
- **`POST /api/auth/verify-token`** - Verificar token y obtener JWT
- **`GET /api/auth/me`** - Obtener información del usuario autenticado

#### Endpoints de Gestión
- **`GET /api/companies`** - Listar empresas
- **`GET /api/branches`** - Listar sucursales (filtrable por companyId)
- **`GET /api/tables`** - Listar mesas (filtrable por branchId)
- **`GET /api/tables/:id`** - Obtener mesa específica con eventos
- **`PUT /api/tables/:id`** - Actualizar mesa y agregar eventos

#### Endpoints de Configuración de Eventos
- **`GET /api/companies/:companyId/event-types`** - Obtener tipos de eventos de una empresa
- **`POST /api/companies/:companyId/event-types`** - Crear nuevo tipo de evento
- **`DELETE /api/event-types/:eventId`** - Eliminar tipo de evento (solo custom)
- **`PUT /api/event-types/:eventId/rename`** - Renombrar evento del sistema
- **`GET /api/resources/:resourceType/:resourceId/events/resolved`** - Obtener eventos con configuración jerárquica aplicada
- **`POST /api/resources/:resourceType/:resourceId/events/config`** - Configurar eventos con overrides
- **`DELETE /api/resources/:resourceType/:resourceId/events/config`** - Resetear configuraciones

#### Endpoints de Usuarios y Permisos
- **`GET /api/users/:userId/permissions`** - Obtener permisos de usuario
- **`POST /api/users/:userId/permissions`** - Agregar permiso a usuario
- **`DELETE /api/users/:userId/permissions`** - Remover permiso de usuario

## 🔐 Sistema de Autenticación

### Magic Links
1. Usuario solicita login con email
2. Sistema genera token temporal (15 minutos, un solo uso)
3. Token se envía por email (Resend API) o se muestra en consola (desarrollo)
4. Usuario verifica token y recibe JWT (7 días de duración)
5. JWT se usa para rutas protegidas

### Sistema de Permisos
- **Usuarios Admin** (`isAdmin: true`): Acceso total al sistema
- **Permisos por Recurso**: `company`, `branch`, `table`
- **Niveles de Permiso**: `view` (solo lectura), `edit` (lectura y escritura)
- **Herencia de Permisos**: Company → Branch → Table

## ⚙️ Sistema de Configuración de Eventos

### Tipos de Eventos

#### Eventos del Sistema (No se pueden deshabilitar)
- **Location Scanned** - Cuando se escanea el código QR de la mesa
- **Acknowledged** - Cuando el personal marca un evento como visto
- **Occupy Location** - Cuando se ocupa una mesa
- **Vacate Location** - Cuando se libera una mesa

#### Eventos Personalizados (Configurables)
- **Call Waiter** - Llamar al mesero
- **Request Check** - Solicitar la cuenta
- **Call Manager** - Llamar al gerente
- *(Los usuarios pueden crear eventos adicionales)*

### Configuración Jerárquica

El sistema permite configurar eventos a tres niveles con herencia automática:

1. **Nivel Empresa** (Configuración base)
2. **Nivel Sucursal** (Override de empresa)
3. **Nivel Mesa** (Override de sucursal)

#### Campos Configurables por Override
- **enabled** - Habilitar/deshabilitar evento
- **eventName** - Nombre del evento (texto para clientes)
- **stateName** - Nombre del estado (texto para administradores)
- **userColor** - Color del botón para clientes
- **userFontColor** - Color del texto del botón
- **userIcon** - Icono del botón (React Icons)
- **adminColor** - Color de estado para administradores
- **priority** - Prioridad de ordenamiento (0-100)

#### Reglas de Herencia
- `null` = Heredar del nivel superior
- Valor específico = Override local
- Los eventos del sistema **siempre están habilitados**

## 📊 Modelo de Datos

### Relaciones Principales
```
Company (1:N) → Branch (1:N) → Table (1:N) → Event
Company (1:N) → EventType
EventType (1:N) → EventConfiguration
User (1:N) → Permission → (Company|Branch|Table)
User (1:N) → AuthToken
```

### Campos Importantes
- **Events**: `eventTypeId`, `message`, `seenAt`, `tableId`
- **EventTypes**: `eventName`, `stateName`, `systemEventType`, `isDefault`
- **EventConfigurations**: `resourceType`, `resourceId`, `eventTypeId`, `enabled`, override fields
- **Permissions**: `resourceType`, `resourceId`, `permissionLevel`
- **AuthTokens**: `token`, `expiresAt`, `used`

## 🔧 Configuración

### Variables de Entorno (.env.development)
```env
# Database
DB_NAME=heymozo
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Authentication
JWT_SECRET=your-secure-jwt-secret

# Email
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=no-reply@heymozo.com

# API
REACT_APP_API_URL=http://localhost:3001/api
NODE_ENV=development
```

## 📝 Scripts Disponibles

```bash
npm run dev       # Desarrollo: Frontend + Backend concurrentemente
npm run start     # Producción: Solo backend
npm run build     # Build de producción del frontend
npm run server    # Solo backend
npm run migrate   # Ejecutar migraciones de BD
npm run seed      # Ejecutar seeders (datos de prueba)
```

## 🚀 Deployment (Producción)

### Configuración en Render

**Build Command:**
```bash
npm install && npm run migrate && npm run build
```

**Start Command:**
```bash
npm start
```

### ¿Por qué incluir migraciones en el build?

Las migraciones están diseñadas para ser **idempotentes** y **seguras**:

- ✅ **Preservan datos**: Usan `alter: true` por defecto (solo ajusta esquema)
- ✅ **No destruyen tablas**: Solo usa `force: true` si se establece `FORCE_RECREATE=true`
- ✅ **Seguras de ejecutar múltiples veces**: Verifican si los cambios ya existen antes de aplicarlos
- ✅ **Mantienen schema sincronizado**: Garantiza que la base de datos coincide con los modelos
- ✅ **Automatizan el setup**: Crean tablas/columnas necesarias para nuevas features

**Proceso de migración en cada deploy:**
1. `sequelize.sync({ alter: true })` - Sincroniza modelos con esquema de BD
2. Ejecuta migraciones específicas en `src/database/migrations/` en orden
3. Cada migración verifica si el cambio ya fue aplicado (idempotencia)

### Script de Recuperación de Emergencia

Si por alguna razón las compañías existentes no tienen EventTypes:

```bash
node src/database/fix-missing-event-types.js
```

Este script:
- Verifica qué compañías no tienen EventTypes
- Crea automáticamente los 7 EventTypes por defecto para esas compañías
- Es seguro ejecutar en producción (no modifica datos existentes)

### Variables de Entorno Requeridas (Producción)

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:port/database
# O alternativamente:
DB_HOST=your-db-host
DB_PORT=5432
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name

JWT_SECRET=your-secure-jwt-secret-min-32-chars
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM=no-reply@yourdomain.com
```

## 🚧 Estado de Implementación

### ✅ Completado
- [x] Backend completo con autenticación
- [x] Sistema de magic links por email
- [x] CRUD de empresas, sucursales y mesas
- [x] Sistema de eventos en tiempo real
- [x] Sistema de permisos granular
- [x] Migraciones de base de datos
- [x] API REST completa
- [x] Frontend básico (landing + componentes admin)
- [x] **Sistema de configuración jerárquica de eventos**
- [x] **EventConfigModal v2 con overrides completos**
- [x] **Protección de eventos del sistema contra deshabilitación**
- [x] **Migración de eventos legacy a sistema EventType/EventConfiguration**

### 🔄 En Progreso
- [ ] Testing de configuraciones jerárquicas en todos los niveles
- [ ] Optimización de rendimiento en carga de eventos

### ⏳ Pendiente
- [ ] Dashboard de analytics
- [ ] Notificaciones push/websockets
- [ ] Mobile responsiveness completo
- [ ] Tests automatizados
- [ ] Documentación de API completa

## 🐛 Testing

### Autenticación con Postman
1. Solicitar login: `POST /api/auth/login-request`
2. Copiar token de la consola del servidor o email
3. Verificar token: `POST /api/auth/verify-token`
4. Usar JWT en header `Authorization: Bearer <token>`

### Testing de Configuración de Eventos
1. Acceder a `/admin/:companyId/config` para configurar a nivel empresa
2. Acceder a `/admin/:companyId/:branchId/config` para configurar a nivel sucursal
3. Hacer clic en una mesa y "Configurar Eventos" para configurar a nivel mesa
4. Verificar herencia y overrides en la interfaz
5. Los eventos del sistema siempre aparecen como "🔒 Sistema (Siempre activo)"

## 📞 Soporte

Para desarrollo y debugging:
- Los tokens de autenticación se muestran en la consola del servidor
- Base de datos configurada para `heymozo` en PostgreSQL local
- Archivos `.env` configurados por ambiente (development/production)
- Logs detallados de configuración de eventos en consola del backend

## 🔄 Migraciones Recientes

### 20250928_migrate_events_to_new_system.js
Migra eventos legacy con campos `type` string a nuevo sistema con `eventTypeId`.

### 20250928_add_override_fields_to_event_configurations.js
Añade campos de override a la tabla EventConfigurations para soportar configuración jerárquica completa.

---

**Última actualización**: 2025-09-29
**Versión**: 0.2.0 - Sistema de Configuración Jerárquica de Eventos