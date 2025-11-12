// backend/src/server.js
import app from "./app.js";
import { ENV } from "./config/index.js";
import { initDB, closeDB } from "./config/index.js";
import { logger } from "./shared/utils/logger.js";
import { startPublicationScheduler } from "./scheduler/publicationScheduler.js";

const startServer = async () => {
  try {
    // Inicializar conexión a la base de datos
    await initDB();
    logger.db("Conectado a la base de datos");

    // Inicializar el scheduler de publicaciones
    startPublicationScheduler();

    // Iniciar el servidor
    const server = app.listen(ENV.port, () => {
      logger.server(`Servidor ejecutándose en puerto ${ENV.port}`);
      logger.server(`Entorno: ${ENV.node}`);
      logger.server(`URL: http://localhost:${ENV.port}`);
      logger.server(`Health Check: http://localhost:${ENV.port}/api/health`);
    });

    // Manejo graceful de cierre del servidor
    const gracefulShutdown = async (signal) => {
      logger.warn(`Recibida señal ${signal}. Cerrando servidor...`);

      server.close(async () => {
        logger.server("Servidor HTTP cerrado");

        try {
          await closeDB();
          logger.db("Conexión a la base de datos cerrada");
          process.exit(0);
        } catch (error) {
          logger.error("Error al cerrar la base de datos:", {
            error: error.message,
          });
          process.exit(1);
        }
      });
    };

    // Escuchar señales de terminación
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Manejo de errores no capturados
    process.on("uncaughtException", (error) => {
      logger.error("Error no capturado:", {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Promesa rechazada no manejada:", { reason, promise });
      process.exit(1);
    });
  } catch (error) {
    logger.error("Error al iniciar el servidor:", { error: error.message });
    process.exit(1);
  }
};

// Iniciar el servidor
startServer();
