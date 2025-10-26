// backend/src/modules/publications/routes/publication.routes.js
import express from "express";
import * as publicationController from "../controllers/publication.controller.js";
import { authenticateJWT, requireRole } from "../../../middlewares/index.js";

const router = express.Router();

// =========== RUTAS PARA ADMIN ===========

/**
 * @route GET /api/publications
 * @desc ADMIN: Obtener TODAS las publicaciones
 * @access ADMIN
 */
router.get(
  "/",
  authenticateJWT,
  requireRole(["ADMIN"]),
  publicationController.getAllPublications
);

/**
 * @route GET /api/publications/stats/:clientId
 * @desc ADMIN o Cliente: Obtener estadísticas de publicaciones
 * @access ADMIN o Cliente propietario
 */
router.get(
  "/stats/:clientId",
  authenticateJWT,
  publicationController.getPublicationStats
);

/**
 * @route POST /api/publications/client/:clientId
 * @desc ADMIN: Crear nueva publicación para un cliente
 * @access ADMIN
 */
router.post(
  "/client/:clientId",
  authenticateJWT,
  requireRole(["ADMIN"]),
  publicationController.createPublication
);

/**
 * @route GET /api/publications/client/:clientId
 * @desc ADMIN/Cliente: Obtener publicaciones de un cliente específico
 * @access ADMIN (ve todas) o Cliente (solo PUBLISHED)
 */
router.get(
  "/client/:clientId",
  authenticateJWT,
  publicationController.getClientPublications
);

/**
 * @route PUT /api/publications/:id
 * @desc ADMIN: Actualizar una publicación
 * @access ADMIN
 */
router.put(
  "/:id",
  authenticateJWT,
  requireRole(["ADMIN"]),
  publicationController.updatePublication
);

/**
 * @route PATCH /api/publications/:id/status
 * @desc ADMIN: Actualizar solo el estado de una publicación
 * @access ADMIN
 */
router.patch(
  "/:id/status",
  authenticateJWT,
  requireRole(["ADMIN"]),
  publicationController.updatePublicationStatus
);

/**
 * @route DELETE /api/publications/:id
 * @desc ADMIN: Eliminar una publicación
 * @access ADMIN
 */
router.delete(
  "/:id",
  authenticateJWT,
  requireRole(["ADMIN"]),
  publicationController.deletePublication
);

// =========== RUTAS PARA CLIENTE ===========

/**
 * @route GET /api/publications/my
 * @desc Cliente: Obtener mis propias publicaciones (solo PUBLISHED)
 * @access Cliente autenticado
 */
router.get(
  "/my",
  authenticateJWT,
  requireRole(["CLIENTE"]),
  publicationController.getMyPublications
);

// =========== RUTAS COMPARTIDAS ===========

/**
 * @route GET /api/publications/:id
 * @desc ADMIN/Cliente: Obtener una publicación específica
 * @access ADMIN (ve todas) o Cliente propietario (solo PUBLISHED)
 */
router.get("/:id", authenticateJWT, publicationController.getPublicationById);

export default router;
