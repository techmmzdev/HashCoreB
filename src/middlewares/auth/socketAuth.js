// backend/src/middlewares/auth/socketAuth.js
import jwt from "jsonwebtoken";
import { ENV } from "../../config/env.js";

/**
 * Verifica un token JWT para conexiones de WebSocket
 * Retorna los datos del usuario si el token es válido, null si no lo es
 */
export const verifySocketToken = (token) => {
  if (!token) return null;

  try {
    const user = jwt.verify(token, ENV.jwtSecret);
    return user;
  } catch (error) {
    console.warn(
      "Intento de conexión de socket con token JWT inválido:",
      error.message
    );
    return null;
  }
};

/**
 * Middleware para Socket.IO que verifica autenticación
 * Uso: io.use(socketAuthMiddleware)
 */
export const socketAuthMiddleware = (socket, next) => {
  const token =
    socket.handshake.auth.token ||
    socket.handshake.headers.authorization?.split(" ")[1];

  const user = verifySocketToken(token);

  if (!user) {
    return next(new Error("Authentication error"));
  }

  socket.user = user;
  next();
};

/**
 * Middleware para Socket.IO que verifica roles específicos
 * Uso: io.use(socketRoleMiddleware(["ADMIN", "CLIENTE"]))
 */
export const socketRoleMiddleware = (allowedRoles) => {
  return (socket, next) => {
    const userRole = socket.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return next(new Error("Insufficient permissions"));
    }

    next();
  };
};

/**
 * Middleware para Socket.IO específico para admins
 */
export const socketRequireAdmin = socketRoleMiddleware(["ADMIN"]);

/**
 * Middleware para Socket.IO específico para clientes
 */
export const socketRequireClient = socketRoleMiddleware(["CLIENTE"]);
