// backend/src/modules/comments/routes/comment.routes.js
import express from "express";
import * as commentController from "../controllers/comment.controller.js";
import { authenticateJWT, requireRole } from "../../../middlewares/index.js";

const router = express.Router();

/**
 * @route POST /api/comments/publications/:publicationId
 * @desc ADMIN/Cliente: Crear un comentario en una publicación (RF-013)
 * @access Usuarios autenticados
 */
router.post(
  "/publications/:publicationId",
  authenticateJWT,
  commentController.createComment
);

/**
 * @route GET /api/comments/publications/:publicationId
 * @desc ADMIN/Cliente: Obtener comentarios de una publicación (RF-014)
 * @access ADMIN (ve todo) o Cliente propietario
 */
router.get(
  "/publications/:publicationId",
  authenticateJWT,
  commentController.getComments
);

/**
 * @route GET /api/comments/publications/:publicationId/stats
 * @desc ADMIN/Cliente: Obtener estadísticas de comentarios
 * @access ADMIN (ve todo) o Cliente propietario
 */
router.get(
  "/publications/:publicationId/stats",
  authenticateJWT,
  commentController.getCommentStats
);

/**
 * @route DELETE /api/comments/publications/:publicationId/comments/:commentId
 * @desc ADMIN: Eliminar un comentario específico (RF-015)
 * @access ADMIN
 */
router.delete(
  "/publications/:publicationId/comments/:commentId",
  authenticateJWT,
  requireRole(["ADMIN"]),
  commentController.deleteComment
);

export default router;
