// server.js

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

console.log('Starting server setup');

// Sirve los archivos estáticos desde la carpeta build
app.use(express.static(path.join(__dirname, 'build')));

let router;
try {
  console.log('Attempting to require json-server');
  const jsonServer = require('json-server');
  
  console.log('Checking for db.json');
  if (fs.existsSync('db.json')) {
    console.log('db.json found, loading');
    router = jsonServer.router('db.json');
  } else {
    console.warn('db.json not found, attempting to generate');
    require('./db.js'); // Asume que db.js es el script que genera la base de datos
    if (fs.existsSync('db.json')) {
      console.log('db.json generated successfully, loading');
      router = jsonServer.router('db.json');
    } else {
      console.warn('Failed to generate db.json, creating an empty database');
      router = jsonServer.router({});
    }
  }
  
  const middlewares = jsonServer.defaults();

  // Usa json-server para /api
  app.use('/api', middlewares, router);
} catch (err) {
  console.error('Error setting up json-server:', err);
  console.error('Make sure json-server is installed and listed in package.json');
}

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
  // No cerramos el proceso aquí para que Render pueda reiniciarlo
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // No cerramos el proceso aquí para que Render pueda reiniciarlo
});
