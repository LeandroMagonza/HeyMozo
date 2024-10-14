// server.js

const express = require('express');
const path = require('path');
const jsonServer = require('json-server');

const app = express();
const port = process.env.PORT || 3000;

// Sirve los archivos estáticos desde la carpeta build
app.use(express.static(path.join(__dirname, 'build')));

// Configura json-server
const router = jsonServer.router('db.json');
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
