// backend/src/app.js
import express from "express";
import cors from "cors";
import path from "path";
import { ENV } from "./config/index.js";
import { setupRoutes } from "./routes/index.js";

const app = express();

// =================== MIDDLEWARES GLOBALES ===================

// CORS - Configuración para desarrollo
app.use(
  cors({
    origin: process.env.FRONTEND_URL, // React default
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Parsing de JSON y URL-encoded
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Servir archivos estáticos (uploads)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Servir archivos estáticos públicos (favicon, etc.)
app.use(express.static(path.join(process.cwd(), "public")));

// Logging básico en desarrollo
if (ENV.node === "development") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// =================== CONFIGURAR RUTAS ===================
setupRoutes(app);

// =================== MIDDLEWARE DE MANEJO DE ERRORES ===================
app.use((err, req, res, next) => {
  console.error("Error no manejado:", err);
  res.status(500).json({
    message: "Error interno del servidor",
    ...(ENV.node === "development" && { error: err.message }),
  });
});

export default app;
