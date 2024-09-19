// server.js

const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
}

// Proxy API requests to JSON Server
app.use('/api', createProxyMiddleware({ 
  target: 'http://localhost:3002', // JSON Server
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // remove /api prefix when forwarding to JSON Server
  },
}));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server')
  jsonServerProcess.kill();
  server.close(() => {
    console.log('HTTP server closed')
  })
});
