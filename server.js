// server.js

const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const routes = require('./routes.json');

server.use(middlewares);
server.use(jsonServer.rewriter(routes));
server.use('/api', router);

const port = 3002;
server.listen(port, () => {
  console.log(`JSON Server is running on port ${port}`);
});
