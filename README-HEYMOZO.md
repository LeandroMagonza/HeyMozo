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
- **Nodemailer** para envío de emails (magic links)
- **CORS** para comunicación frontend-backend

### Frontend
- **React 18** con React Router DOM
- **Axios** para peticiones HTTP
- **CSS modules** para estilos
- **React Icons** para iconografía

### Base de Datos
- **PostgreSQL** con las siguientes tablas principales:
  - `Companies` - Empresas/restaurantes
  - `Branches` - Sucursales de cada empresa
  - `Tables` - Mesas de cada sucursal
  - `Events` - Eventos/solicitudes de cada mesa
  - `Users` - Usuarios del sistema (administradores/personal)
  - `Permissions` - Permisos de acceso por usuario
  - `AuthTokens` - Tokens de autenticación temporal
  - `MailingList` - Lista de emails de contacto

## 📁 Estructura del Proyecto

```
heymozo/
├── server.js                 # Servidor principal Express
├── package.json             # Dependencias y scripts
├── src/                     # Frontend React
│   ├── App.js              # Componente principal y rutas
│   ├── components/         # Componentes de la interfaz
│   ├── services/           # Servicios API y autenticación
│   ├── models/             # Modelos Sequelize
│   ├── routes/             # Rutas del backend
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

#### Endpoints de Usuarios y Permisos
- **`GET /api/users/:userId/permissions`** - Obtener permisos de usuario
- **`POST /api/users/:userId/permissions`** - Agregar permiso a usuario
- **`DELETE /api/users/:userId/permissions`** - Remover permiso de usuario

## 🔐 Sistema de Autenticación

### Magic Links
1. Usuario solicita login con email
2. Sistema genera token temporal (15 minutos, un solo uso)
3. Token se muestra en consola del servidor (desarrollo)
4. Usuario verifica token y recibe JWT (7 días de duración)
5. JWT se usa para rutas protegidas

### Sistema de Permisos
- **Usuarios Admin** (`isAdmin: true`): Acceso total al sistema
- **Permisos por Recurso**: `company`, `branch`, `table`
- **Niveles de Permiso**: `view` (solo lectura), `edit` (lectura y escritura)
- **Herencia de Permisos**: Company → Branch → Table

## 📊 Modelo de Datos

### Relaciones Principales
```
Company (1:N) → Branch (1:N) → Table (1:N) → Event
User (1:N) → Permission → (Company|Branch|Table)
User (1:N) → AuthToken
```

### Campos Importantes
- **Events**: `type` (CALL_WAITER, REQUEST_BILL, etc.), `message`, `seenAt`
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

# API
REACT_APP_API_URL=http://localhost:3001/api
NODE_ENV=development

# Email (desarrollo - muestra en consola)
EMAIL_FROM=no-reply@heymozo.com
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

### 🔄 En Progreso
- [ ] Página de login para magic links
- [ ] Middleware de verificación de permisos en frontend
- [ ] Protección de rutas administrativas

### ⏳ Pendiente
- [ ] Envío real de emails (actualmente solo consola)
- [ ] Dashboard de analytics
- [ ] Notificaciones push/websockets
- [ ] Mobile responsiveness completo
- [ ] Tests automatizados

## 🐛 Testing

### Autenticación con Postman
1. Importar `HeyMozo_Auth_Testing.postman_collection.json`
2. Solicitar login: `POST /api/auth/login-request`
3. Copiar token de la consola del servidor
4. Verificar token: `POST /api/auth/verify-token`
5. Usar JWT en header `Authorization: Bearer <token>`

## 📞 Soporte

Para desarrollo y debugging:
- Los tokens de autenticación se muestran en la consola del servidor
- Base de datos configurada para `heymozo` en PostgreSQL local
- Archivos `.env` configurados por ambiente (development/production)

---

**Última actualización**: 2024-06-24
**Versión**: 0.1.0 