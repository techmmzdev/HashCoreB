// backend/src/middlewares/auth/clientStatus.js
import { getPrisma } from "../../config/db.js";

const prisma = getPrisma();

/**
 * Middleware para verificar que el cliente esté activo
 * Solo aplica para usuarios con rol CLIENTE
 * Requiere que el usuario esté autenticado previamente (req.user debe existir)
 */
export const verifyClientStatus = async (req, res, next) => {
  // Solo verificar si es un cliente
  if (req.user?.role !== "CLIENTE") {
    return next();
  }

  try {
    const client = await prisma.clients.findUnique({
      where: { user_id: req.user.id },
    });

    if (!client) {
      return res
        .status(404)
        .json({ message: "Información de cliente no encontrada." });
    }

    if (client.status === false) {
      return res.status(403).json({ message: "Cuenta de cliente inactiva." });
    }

    // Agregar información del cliente al request para uso posterior
    req.client = client;
    return next();
  } catch (err) {
    console.error("Error verificando estado del cliente:", err);
    return res
      .status(500)
      .json({ message: "Error interno al verificar la cuenta." });
  }
};

/**
 * Middleware que requiere que el cliente tenga un plan específico
 * Solo aplica para usuarios con rol CLIENTE
 */
export const requireClientPlan = (allowedPlans) => {
  return async (req, res, next) => {
    // Solo verificar si es un cliente
    if (req.user?.role !== "CLIENTE") {
      return next();
    }

    try {
      const client = await prisma.clients.findUnique({
        where: { user_id: req.user.id },
      });

      if (!client) {
        return res
          .status(404)
          .json({ message: "Información de cliente no encontrada." });
      }

      if (!allowedPlans.includes(client.plan)) {
        return res.status(403).json({
          message: `Esta funcionalidad requiere un plan ${allowedPlans.join(
            " o "
          )}.`,
          currentPlan: client.plan,
          requiredPlans: allowedPlans,
        });
      }

      req.client = client;
      return next();
    } catch (err) {
      console.error("Error verificando plan del cliente:", err);
      return res
        .status(500)
        .json({ message: "Error interno al verificar el plan." });
    }
  };
};

/**
 * Middlewares específicos para planes
 */
export const requireBasicPlan = requireClientPlan([
  "BASIC",
  "STANDARD",
  "FULL",
]);
export const requireStandardPlan = requireClientPlan(["STANDARD", "FULL"]);
export const requireFullPlan = requireClientPlan(["FULL"]);
