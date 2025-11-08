// backend/src/middlewares/authMiddleware.js
// Este archivo mantiene compatibilidad con el código existente
// Los nuevos proyectos deberían usar las importaciones directas desde /auth/

// Re-exportar todos los middlewares desde la nueva estructura
export {
  // JWT Authentication
  authenticateJWT,
  verifyToken,

  // Role Authorization
  requireRole,
  requireAdmin,
  requireClient,
  requireAnyRole,
  requireAdminOrOwner,

  // Client Status
  verifyClientStatus,
  requireClientPlan,
  requireBasicPlan,
  requireStandardPlan,
  requireFullPlan,

  // Socket Authentication
  verifySocketToken,
  socketAuthMiddleware,
  socketRoleMiddleware,
  socketRequireAdmin,
  socketRequireClient,

  // Common combinations
  authenticateAndVerifyClient,
  authenticateAdmin,
  authenticateClient,
} from "./auth/index.js";

// Middleware combinado original para mantener compatibilidad
import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";
import { getPrisma } from "../config/db.js";

const prisma = getPrisma();

/**
 * @deprecated Use authenticateJWT + verifyClientStatus instead
 * Middleware original que combina autenticación JWT y verificación de cliente
 * Mantenido por compatibilidad con código existente
 */
export const authenticateJWTLegacy = async (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Token no proporcionado o inválido." });
  }

  try {
    const user = jwt.verify(token, ENV.jwtSecret);
    req.user = user;

    if (user.role === "CLIENTE") {
      try {
        const client = await prisma.clients.findUnique({
          where: { user_id: user.id },
        });
        if (client && client.status === false) {
          return res
            .status(403)
            .json({ message: "Cuenta de cliente inactiva." });
        }
      } catch (err) {
        console.error("Error verificando estado del cliente:", err);
        return res
          .status(500)
          .json({ message: "Error interno al verificar la cuenta." });
      }
    }

    return next();
  } catch (err) {
    const status = err.name === "TokenExpiredError" ? 401 : 403;
    return res
      .status(status)
      .json({ message: "Sesión expirada o token no válido." });
  }
};
