// server.js

const path = require('path');
const express = require('express');
const app = express();
const { execSync } = require('child_process');

// Ejecutar db.js para generar db.json
execSync('node db.js');

// Servir los archivos estáticos de React
app.use(express.static(path.join(__dirname, 'build')));

// Configurar JSON Server
const jsonServer = require('json-server');
const apiServer = jsonServer.create();
const apiRouter = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

apiServer.use(middlewares);
apiServer.use(apiRouter);

// Usar /api como prefijo para las rutas de la API
app.use('/api', apiServer);

// Para cualquier otra ruta, devolver el index.html de React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
