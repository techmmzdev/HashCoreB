// backend/src/server.js
import app from "./app.js";
import { ENV } from "./config/index.js";
import { initDB, closeDB } from "./config/index.js";

const startServer = async () => {
  try {
    // Inicializar conexión a la base de datos
    await initDB();
    console.log(`[DB] ✅ Conectado a la base de datos`);

    // Iniciar el servidor
    const server = app.listen(ENV.port, () => {
      console.log(`[SERVER] ✅ Servidor ejecutándose en puerto ${ENV.port}`);
      console.log(`[SERVER] 🌐 Entorno: ${ENV.node}`);
      console.log(`[SERVER] 🔗 URL: http://localhost:${ENV.port}`);
      console.log(
        `[SERVER] 📋 Health Check: http://localhost:${ENV.port}/api/health`
      );
    });

    // Manejo graceful de cierre del servidor
    const gracefulShutdown = async (signal) => {
      console.log(
        `\n[SERVER] ⚠️  Recibida señal ${signal}. Cerrando servidor...`
      );

      server.close(async () => {
        console.log("[SERVER] ❌ Servidor HTTP cerrado");

        try {
          await closeDB();
          console.log("[DB] ❌ Conexión a la base de datos cerrada");
          process.exit(0);
        } catch (error) {
          console.error("[DB] ❌ Error al cerrar la base de datos:", error);
          process.exit(1);
        }
      });
    };

    // Escuchar señales de terminación
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Manejo de errores no capturados
    process.on("uncaughtException", (error) => {
      console.error("[SERVER] ❌ Error no capturado:", error);
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("[SERVER] ❌ Promesa rechazada no manejada:", reason);
      console.error("En:", promise);
      process.exit(1);
    });
  } catch (error) {
    console.error("[SERVER] ❌ Error al iniciar el servidor:", error);
    process.exit(1);
  }
};

// Iniciar el servidor
startServer();
