// backend/src/shared/utils/logger.js
import { ENV } from "../../config/env.js";

/**
 * Sistema de logging liviano pero robusto para HashCore
 * Ajusta automáticamente el nivel de logging según el entorno
 */

const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const LogColors = {
  ERROR: "\x1b[31m", // Rojo
  WARN: "\x1b[33m", // Amarillo
  INFO: "\x1b[36m", // Cian
  DEBUG: "\x1b[90m", // Gris
  RESET: "\x1b[0m",
};

class Logger {
  constructor() {
    // En producción, solo mostramos ERROR y WARN
    // En desarrollo, mostramos todo
    this.level = ENV.node === "production" ? LogLevel.WARN : LogLevel.DEBUG;
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const color = LogColors[level] || "";
    const reset = LogColors.RESET;

    let formattedMessage = `${timestamp} [${level}] ${message}`;

    // Agregar metadata si existe
    if (Object.keys(meta).length > 0) {
      formattedMessage += ` ${JSON.stringify(meta)}`;
    }

    // En desarrollo, agregar colores
    if (ENV.node === "development") {
      return `${color}${formattedMessage}${reset}`;
    }

    return formattedMessage;
  }

  error(message, meta = {}) {
    if (this.level >= LogLevel.ERROR) {
      console.error(this.formatMessage("ERROR", message, meta));
    }
  }

  warn(message, meta = {}) {
    if (this.level >= LogLevel.WARN) {
      console.warn(this.formatMessage("WARN", message, meta));
    }
  }

  info(message, meta = {}) {
    if (this.level >= LogLevel.INFO) {
      console.log(this.formatMessage("INFO", message, meta));
    }
  }

  debug(message, meta = {}) {
    if (this.level >= LogLevel.DEBUG) {
      console.log(this.formatMessage("DEBUG", message, meta));
    }
  }

  // Métodos específicos para diferentes componentes
  server(message, meta = {}) {
    this.info(`[SERVER] ${message}`, meta);
  }

  db(message, meta = {}) {
    this.info(`[DB] ${message}`, meta);
  }

  auth(message, meta = {}) {
    this.info(`[AUTH] ${message}`, meta);
  }

  api(message, meta = {}) {
    this.debug(`[API] ${message}`, meta);
  }

  media(message, meta = {}) {
    this.debug(`[MEDIA] ${message}`, meta);
  }
}

// Instancia singleton del logger
export const logger = new Logger();

// Función para hacer logging de requests HTTP
export const logRequest = (req, res, next) => {
  if (ENV.node === "development") {
    logger.api(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
  }
  next();
};
