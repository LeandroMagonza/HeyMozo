// server.js

const express = require('express');
const path = require('path');
const jsonServer = require('json-server');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

console.log('Starting server setup');

// Sirve los archivos estáticos desde la carpeta build
app.use(express.static(path.join(__dirname, 'build')));

// Configura json-server
let router;
try {
  console.log('Checking for db.json');
  if (fs.existsSync('db.json')) {
    console.log('db.json found, loading');
    router = jsonServer.router('db.json');
  } else {
    console.warn('db.json not found, creating an empty database');
    router = jsonServer.router({});
  }
} catch (err) {
  console.error('Error setting up json-server:', err);
  router = jsonServer.router({});
}

const middlewares = jsonServer.defaults();

// Usa json-server para /api
app.use('/api', middlewares, router);

// Todas las demás solicitudes GET no manejadas devolverán nuestra app de React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
