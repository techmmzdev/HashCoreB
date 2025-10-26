// backend/src/modules/comments/services/comment.service.js (Versión Adaptada)
import { getPrisma } from "../../../config/db.js";

const prisma = getPrisma();

/**
 * Crear un nuevo comentario en una publicación
 * @param {number} publicationId - ID de la publicación
 * @param {number} userId - ID del usuario que comenta
 * @param {object} commentData - Datos del comentario {comment, text}
 * @returns {Promise<object>} - Comentario creado
 */
export const createComment = async (publicationId, userId, commentData) => {
  const { comment, text } = commentData;
  const commentText = comment || text;

  if (!commentText) {
    // Error de validación de negocio, se lanza.
    throw new Error("El comentario no puede estar vacío.");
  }

  try {
    const newComment = await prisma.comments.create({
      data: {
        publication_id: publicationId,
        user_id: userId,
        comment: commentText,
        created_at: new Date(),
      },
      include: {
        user: {
          select: { id: true, email: true, role: true, name: true },
        },
      },
    });
    return newComment;
  } catch (error) {
    // Solo se lanza el error (el Controller se encarga de traducirlo)
    throw error;
  }
};

/**
 * Obtener comentarios de una publicación
 * @param {number} publicationId - ID de la publicación
 * @returns {Promise<array>} - Lista de comentarios
 */
export const getCommentsByPublicationId = async (publicationId) => {
  try {
    const comments = await prisma.comments.findMany({
      where: { publication_id: publicationId },
      include: {
        user: {
          select: { id: true, email: true, role: true, name: true },
        },
      },
      orderBy: { created_at: "desc" },
    });
    return comments;
  } catch (error) {
    // Solo se lanza el error
    throw error;
  }
};

/**
 * Obtener un comentario específico por ID
 * @param {number} commentId - ID del comentario
 * @returns {Promise<object|null>} - Comentario encontrado o null
 */
export const getCommentById = async (commentId) => {
  try {
    const comment = await prisma.comments.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
    });
    return comment;
  } catch (error) {
    throw error;
  }
};

/**
 * Eliminar un comentario
 * @param {number} commentId - ID del comentario
 * @returns {Promise<object>} - Comentario eliminado
 */
export const deleteComment = async (commentId) => {
  try {
    const deletedComment = await prisma.comments.delete({
      where: { id: commentId },
    });
    return deletedComment;
  } catch (error) {
    // Solo se lanza el error
    throw error;
  }
};

/**
 * Obtener estadísticas de comentarios para una publicación
 * @param {number} publicationId - ID de la publicación
 * @returns {Promise<object>} - Estadísticas de comentarios
 */
export const getCommentStats = async (publicationId) => {
  try {
    const [totalComments, adminComments, clientComments] = await Promise.all([
      prisma.comments.count({
        where: { publication_id: publicationId },
      }),
      prisma.comments.count({
        where: {
          publication_id: publicationId,
          user: { role: "ADMIN" },
        },
      }),
      prisma.comments.count({
        where: {
          publication_id: publicationId,
          user: { role: "CLIENTE" },
        },
      }),
    ]);

    return {
      total: totalComments,
      byRole: {
        admin: adminComments,
        client: clientComments,
      },
    };
  } catch (error) {
    throw error;
  }
};
