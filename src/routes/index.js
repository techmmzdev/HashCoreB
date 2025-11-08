// backend/src/routes/index.js
// Archivo principal para importar todas las rutas modulares

import { authRoutes } from "../modules/auth/index.js";
import { userRoutes } from "../modules/users/index.js";
import { clientRoutes } from "../modules/clients/index.js"
import { publicationRoutes } from "../modules/publications/index.js";
import { mediaRoutes } from "../modules/media/index.js";
import { commentRoutes } from "../modules/comments/index.js";
import { calendarRoutes } from "../modules/calendar/index.js";

export const setupRoutes = (app) => {
  // Rutas de autenticación
  app.use("/api/auth", authRoutes);

  // Rutas de usuarios
  app.use("/api/users", userRoutes);

  // Rutas de clientes
  app.use("/api/clients", clientRoutes);

  // Rutas de publicaciones
  app.use("/api/publications", publicationRoutes);

  // Rutas de media
  app.use("/api/media", mediaRoutes);

  // Rutas de comentarios
  app.use("/api/comments", commentRoutes);

  // Rutas de calendar/calendario
  app.use("/api/calendar", calendarRoutes);

  // Ruta de salud del servidor
  app.get("/api/health", (req, res) => {
    res.status(200).json({
      message: "Servidor funcionando correctamente",
      timestamp: new Date().toISOString(),
    });
  });

  // Página raíz de prueba
  app.get("/", (req, res) => {
    res.type("html").send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Backend API</title>
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        html, body {
          height: 100%;
          overflow: hidden;
        }
        body {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #312e81, #db2777);
          color: white;
          font-family: 'Segoe UI', Roboto, sans-serif;
          text-align: center;
          position: relative;
        }
        h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
        p { font-size: 1.2rem; margin-bottom: 2rem; }
        footer { position: absolute; bottom: 1rem; font-size: 0.9rem; opacity: 0.8; }
      </style>
    </head>
    <body>
      <header>
        <h1>🚀 Servidor en funcionamiento</h1>
        <p>Bienvenido al <span>Backend API</span></p>
      </header>
      <footer>
        <p>© ${new Date().getFullYear()} - Backend API funcionando correctamente</p>
      </footer>
    </body>
    </html>
  `);
  });

  // Ruta 404 para endpoints no encontrados bajo /api
  app.use("/api", (req, res) => {
    res.status(404).json({
      message: "Endpoint no encontrado",
      path: req.originalUrl,
    });
  });
};

// Exportaciones individuales para importación específica
export {
  authRoutes,
  userRoutes,
  clientRoutes,
  publicationRoutes,
  mediaRoutes,
  commentRoutes,
};
