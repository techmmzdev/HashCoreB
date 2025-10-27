// backend/src/modules/clients/routes/client.routes.js
import express from "express";
import {
  getAllClients,
  getMyClientInfo,
  updateMyClientInfo,
  getClientById,
  getClientByUserId,
  getClientPublications,
  updateClient,
  toggleClientStatus,
  deleteClient,
} from "../controllers/client.controller.js";
import { authenticateJWT, requireAdmin } from "../../../middlewares/index.js";

const router = express.Router();

// =================== RUTAS PROTEGIDAS - CLIENTE ===================
// IMPORTANTE: Estas rutas van ANTES que las rutas con parámetros
router.get("/me", authenticateJWT, getMyClientInfo); // Mi información como cliente
router.put("/me", authenticateJWT, updateMyClientInfo); // Actualizar mi información

// =================== RUTAS PROTEGIDAS - ADMIN ===================
router.get("/", authenticateJWT, requireAdmin, getAllClients); // Todos los clientes
router.put("/:clientId", authenticateJWT, requireAdmin, updateClient); // Actualizar cliente
router.put(
  "/:clientId/status",
  authenticateJWT,
  requireAdmin,
  toggleClientStatus
); // Cambiar estado
router.delete("/:clientId", authenticateJWT, requireAdmin, deleteClient); // Eliminar cliente

// =================== RUTAS PROTEGIDAS - ADMIN O PROPIO CLIENTE ===================
router.get("/user/:userId", authenticateJWT, getClientByUserId); // Cliente por user_id (ADMIN o propio)

// =================== RUTAS PROTEGIDAS - SOLO ADMIN ===================
router.get("/:clientId", authenticateJWT, requireAdmin, getClientById); // Cliente por ID
router.get(
  "/:clientId/publications",
  authenticateJWT,
  requireAdmin,
  getClientPublications
); // Publicaciones del cliente

export default router;
