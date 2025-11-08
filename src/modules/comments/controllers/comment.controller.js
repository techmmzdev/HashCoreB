// backend/src/modules/comments/controllers/comment.controller.js (Versión Adaptada)
import * as commentService from "../services/comment.service.js";
import * as publicationService from "../../publications/services/publication.service.js";
import { handleControllerError } from "../../../shared/utils/errorHandler.js";
import { getPrisma } from "../../../config/db.js";

const prisma = getPrisma();

// Función auxiliar para manejar errores (la misma lógica de los otros controllers)
const handleCommentControllerError = (res, error, defaultMessage) => {
  console.error(error);
  try {
    // Manejo específico de errores de validación
    if (
      error.message.includes("no fue encontrado") ||
      error.message.includes("no existe")
    ) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes("El comentario no puede estar vacío")) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(400).json({ message: error.message });
  } catch (handledError) {
    return res
      .status(500)
      .json({ message: defaultMessage + ": Error inesperado." });
  }
};

/**
 * Crear un nuevo comentario (ADMIN y CLIENTE) - RF-013
 */
export const createComment = async (req, res) => {
  try {
    const publicationId = parseInt(req.params.publicationId);
    const userId = req.user.id;

    // Validaciones de entrada
    if (isNaN(publicationId)) {
      return res.status(400).json({ message: "ID de publicación inválido." });
    }

    // Crear el comentario
    const newComment = await commentService.createComment(
      publicationId,
      userId,
      req.body
    );

    // Lógica de Notificación con Socket.IO (Controlador maneja el IO)
    const io = req.io;

    if (io) {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { name: true, role: true },
      });

      // Solo notificar si el que comenta es un CLIENTE
      if (user && user.role !== "ADMIN") {
        const notificationData = {
          id: newComment.id,
          publicationId: publicationId,
          commenterName: user.name || "Cliente",
          message: `📢 Nuevo feedback de ${user.name} en la publicación #${publicationId}.`,
          timestamp: new Date().toISOString(),
        };

        io.to("admin_notifications").emit(
          "new_comment_notification",
          notificationData
        );
        console.log(
          `[Socket.IO] Notificación emitida a la sala 'admin_notifications'`
        );
      }
    }

    res.status(201).json({
      comment: newComment,
      message: "Comentario creado exitosamente.",
    });
  } catch (error) {
    handleCommentControllerError(res, error, "Error al crear el comentario");
  }
};

/**
 * Obtener comentarios de una publicación (ADMIN y CLIENTE con permisos) - RF-014
 */
export const getComments = async (req, res) => {
  try {
    const publicationId = parseInt(req.params.publicationId);
    const { role: userRole, clientId: userClientId } = req.user;

    if (isNaN(publicationId)) {
      return res.status(400).json({ message: "ID de publicación inválido." });
    }

    // Obtener publicación para verificar existencia y propietario
    // Mejoramos la seguridad: usamos la misma lógica que getMedia
    const publication = await publicationService.getPublicationById(
      publicationId
    );

    if (!publication) {
      return res.status(404).json({ message: "Publicación no encontrada." });
    }

    // Lógica de AUTORIZACIÓN (Controller): Solo ADMIN o DUEÑO
    if (userRole !== "ADMIN") {
      if (publication.client_id !== userClientId) {
        return res.status(403).json({
          message:
            "No tienes permiso para ver los comentarios de esta publicación.",
        });
      }
    }

    // Llamada al servicio
    const comments = await commentService.getCommentsByPublicationId(
      publicationId
    );
    res.status(200).json(comments);
  } catch (error) {
    handleCommentControllerError(
      res,
      error,
      "Error al obtener los comentarios"
    );
  }
};

/**
 * Eliminar un comentario (SOLO ADMIN) - RF-015
 */
export const deleteComment = async (req, res) => {
  // El middleware de ruta ya verifica requireAdmin
  try {
    const publicationId = parseInt(req.params.publicationId);
    const commentId = parseInt(req.params.commentId);

    if (isNaN(publicationId) || isNaN(commentId)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    // Verificamos existencia ANTES de eliminar para devolver 404 claro.
    const existingComment = await commentService.getCommentById(commentId);
    if (!existingComment) {
      return res.status(404).json({ message: "Comentario no encontrado" });
    }

    // Aseguramos que el comentario pertenece a la publicacion indicada
    if (existingComment.publication_id !== publicationId) {
      return res.status(400).json({
        message: "El comentario no pertenece a la publicación indicada.",
      });
    }

    await commentService.deleteComment(commentId);

    res.status(200).json({
      message: "Comentario eliminado exitosamente.",
      id: commentId,
    });
  } catch (error) {
    handleCommentControllerError(res, error, "Error al eliminar el comentario");
  }
};

/**
 * Obtener estadísticas de comentarios para una publicación
 */
export const getCommentStats = async (req, res) => {
  try {
    const publicationId = parseInt(req.params.publicationId);
    const { role: userRole, clientId: userClientId } = req.user;

    if (isNaN(publicationId)) {
      return res.status(400).json({ message: "ID de publicación inválido." });
    }

    // Verificar permisos sobre la publicación
    const publication = await publicationService.getPublicationById(
      publicationId
    );

    if (!publication) {
      return res.status(404).json({ message: "Publicación no encontrada." });
    }

    if (userRole !== "ADMIN" && publication.client_id !== userClientId) {
      return res.status(403).json({
        message: "No tienes permiso para ver estas estadísticas.",
      });
    }

    const stats = await commentService.getCommentStats(publicationId);
    res.status(200).json(stats);
  } catch (error) {
    handleCommentControllerError(
      res,
      error,
      "Error al obtener estadísticas de comentarios"
    );
  }
};
