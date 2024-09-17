// server.js

const jsonServer = require('json-server');
const path = require('path');
const express = require('express');
const app = express();

// Ejecutar db.js para generar db.json
const { execSync } = require('child_process');
execSync('node db.js');

// Configurar JSON Server
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

// Usar los middlewares de JSON Server
app.use(middlewares);

// Servir los archivos estáticos de React
app.use(express.static(path.join(__dirname, 'build')));

// Usar el router de JSON Server
app.use('/api', router);

// Para todas las demás rutas, servir index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Configurar el puerto
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('Servidor escuchando en el puerto ' + port);
});
