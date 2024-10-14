// server.js

const express = require('express');
const path = require('path');
const jsonServer = require('json-server');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Sirve los archivos estáticos desde la carpeta build
app.use(express.static(path.join(__dirname, 'build')));

// Configura json-server
let router;
try {
  if (fs.existsSync('db.json')) {
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
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
