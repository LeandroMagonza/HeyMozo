// server.js

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('Starting server setup');

// Serve static files from the build folder
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
    require('./db.js'); // Assumes db.js is the script that generates the database
    if (fs.existsSync('db.json')) {
      console.log('db.json generated successfully, loading');
      router = jsonServer.router('db.json');
    } else {
      console.warn('Failed to generate db.json, creating an empty database');
      router = jsonServer.router({});
    }
  }
  
  const middlewares = jsonServer.defaults();

  // Use json-server for /api
  app.use('/api', middlewares, router);
} catch (err) {
  console.error('Error setting up json-server:', err);
  console.error('Make sure json-server is installed and listed in package.json');
  
  // Fallback: handle API requests manually
  app.use('/api', (req, res) => {
    res.status(500).json({ error: 'API is currently unavailable' });
  });
}

// All other GET requests not handled before will return our React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // We don't close the process here so that Render can restart it
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // We don't close the process here so that Render can restart it
});
