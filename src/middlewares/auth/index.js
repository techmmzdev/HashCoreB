// backend/src/middlewares/auth/index.js
// Exporta todos los middlewares de autenticación desde un punto central

// JWT Authentication
export { authenticateJWT, verifyToken } from "./jwtAuth.js";

// Role-based Authorization
export {
  requireRole,
  requireAdmin,
  requireClient,
  requireAnyRole,
  requireAdminOrOwner,
} from "./roleAuth.js";

// Client Status Verification
export {
  verifyClientStatus,
  requireClientPlan,
  requireBasicPlan,
  requireStandardPlan,
  requireFullPlan,
} from "./clientStatus.js";

// Socket Authentication
export {
  verifySocketToken,
  socketAuthMiddleware,
  socketRoleMiddleware,
  socketRequireAdmin,
  socketRequireClient,
} from "./socketAuth.js";
