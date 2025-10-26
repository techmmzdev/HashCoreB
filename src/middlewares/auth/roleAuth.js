// backend/src/middlewares/auth/roleAuth.js

/**
 * Middleware para verificar roles específicos
 * Requiere que el usuario esté autenticado previamente (req.user debe existir)
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: "No tienes permisos para realizar esta acción.",
      });
    }
    next();
  };
};

/**
 * Middleware específico para requerir rol ADMIN
 * Usa requireRole internamente para consistencia
 */
export const requireAdmin = requireRole(["ADMIN"]);

/**
 * Middleware específico para requerir rol CLIENTE
 * Útil para rutas específicas de clientes
 */
export const requireClient = requireRole(["CLIENTE"]);

/**
 * Middleware que permite múltiples roles
 * Útil para rutas que pueden ser accedidas por diferentes tipos de usuario
 */
export const requireAnyRole = (...roles) => requireRole(roles);

/**
 * Middleware que requiere ser ADMIN o el propietario del recurso
 * Útil para permitir acceso a admins o al usuario dueño del recurso
 */
export const requireAdminOrOwner = (getUserIdFromRequest) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    // Si es admin, permitir acceso
    if (userRole === "ADMIN") {
      return next();
    }

    // Si no es admin, verificar que sea el dueño del recurso
    const resourceUserId = getUserIdFromRequest(req);
    if (userId === resourceUserId) {
      return next();
    }

    return res.status(403).json({
      message: "No tienes permisos para realizar esta acción.",
    });
  };
};
