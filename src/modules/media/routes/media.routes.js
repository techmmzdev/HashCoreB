// backend/src/modules/media/routes/media.routes.js
import express from "express";
import * as mediaController from "../controllers/media.controller.js";
import { authenticateJWT, requireRole } from "../../../middlewares/index.js";
import { upload } from "../../../middlewares/upload.js";

const router = express.Router();

/**
 * @route POST /api/media/publications/:publicationId
 * @desc ADMIN: Subir material multimedia a una publicación
 * @access ADMIN
 */
router.post(
  "/publications/:publicationId",
  authenticateJWT,
  requireRole(["ADMIN"]),
  upload.single("mediaFile"),
  mediaController.uploadMedia
);

/**
 * @route GET /api/media/publications/:publicationId
 * @desc ADMIN/Cliente: Obtener material multimedia de una publicación
 * @access ADMIN (ve todo) o Cliente propietario
 */
router.get(
  "/publications/:publicationId",
  authenticateJWT,
  mediaController.getMedia
);

/**
 * @route GET /api/media/publications/:publicationId/stats
 * @desc ADMIN/Cliente: Obtener estadísticas de multimedia de una publicación
 * @access ADMIN (ve todo) o Cliente propietario
 */
router.get(
  "/publications/:publicationId/stats",
  authenticateJWT,
  mediaController.getMediaStats
);

/**
 * @route DELETE /api/media/publications/:publicationId/media/:mediaId
 * @desc ADMIN: Eliminar material multimedia específico
 * @access ADMIN
 */
router.delete(
  "/publications/:publicationId/media/:mediaId",
  authenticateJWT,
  requireRole(["ADMIN"]),
  mediaController.deleteMedia
);

export default router;
