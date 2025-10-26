// backend/src/middlewares/auth/jwtAuth.js
import jwt from "jsonwebtoken";
import { ENV } from "../../config/env.js";

/**
 * Middleware básico para verificar tokens JWT
 * Solo valida el token y extrae la información del usuario
 */
export const authenticateJWT = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Token no proporcionado o inválido." });
  }

  try {
    const user = jwt.verify(token, ENV.jwtSecret);
    req.user = user;
    return next();
  } catch (err) {
    const status = err.name === "TokenExpiredError" ? 401 : 403;
    return res
      .status(status)
      .json({ message: "Sesión expirada o token no válido." });
  }
};

/**
 * Utilidad para verificar tokens JWT sin middleware
 * Útil para verificaciones manuales o testing
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, ENV.jwtSecret);
  } catch (error) {
    return null;
  }
};
