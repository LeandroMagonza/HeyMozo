// server.js

const express = require("express");
const path = require("path");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors"); // Añade esta línea

const app = express();

// Analizar cuerpos de solicitud JSON y URL codificados
app.use(express.json({ limit: "50mb" })); // Para analizar cuerpos de solicitud JSON
app.use(express.urlencoded({ extended: true, limit: "50mb" })); // Para analizar cuerpos de solicitud codificados en URL

// Habilitar CORS para todas las rutas
app.use(cors());

// Servir archivos estáticos de React en producción
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "build")));
}

// Proxy API requests to JSON Server
app.use((req, res, next) => {
  console.log(`Received request: ${req.method} ${req.path}`);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  next();
});

app.use(
  "/api",
  createProxyMiddleware({
    target: "http://localhost:3002", // JSON Server
    changeOrigin: true,
    pathRewrite: {
      "^/api": "", // remove /api prefix when forwarding to JSON Server
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log("Proxying request to:", proxyReq.path);
      if (req.body) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader("Content-Type", "application/json");
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log("Received response from proxy:", proxyRes.statusCode);
    },
  })
);

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });
}

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Servidor ejecutándose en el puerto ${port}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  jsonServerProcess.kill();
  server.close(() => {
    console.log("HTTP server closed");
  });
});
