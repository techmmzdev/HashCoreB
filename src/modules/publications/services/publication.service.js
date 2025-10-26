// backend/src/modules/publications/services/publication.service.js
import { getPrisma } from "../../../config/db.js";
import fs from "fs";
import path from "path";

const prisma = getPrisma();
const VALID_CONTENT_TYPES = ["POST", "REEL"];
const VALID_STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHED"];

// ======================= HELPERS =======================

/**
 * Elimina archivos multimedia incompatibles cuando se cambia el content_type
 * @param {number} publicationId - ID de la publicación
 * @param {string} newContentType - Nuevo tipo de contenido (POST/REEL)
 * @returns {Promise<Array>} - Array de archivos eliminados
 */
const deleteIncompatibleMedia = async (publicationId, newContentType) => {
  try {
    // Obtener media actual de la publicación
    const existingMedia = await prisma.media.findMany({
      where: { publication_id: publicationId },
    });

    if (existingMedia.length === 0) {
      return [];
    }

    const deletedFiles = [];
    const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    const videoTypes = ["video/mp4", "video/webm"];

    for (const media of existingMedia) {
      const mime = (media.media_type || "").toLowerCase();
      let shouldDelete = false;

      // Si cambiamos a REEL, eliminar imágenes
      if (newContentType === "REEL" && imageTypes.includes(mime)) {
        shouldDelete = true;
      }

      // Si cambiamos a POST, eliminar videos
      if (newContentType === "POST" && videoTypes.includes(mime)) {
        shouldDelete = true;
      }

      if (shouldDelete) {
        // Eliminar archivo físico
        const uploadsDir = path.join(process.cwd(), "uploads");
        const absolutePath = path.join(uploadsDir, media.url);

        try {
          if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            console.info(
              `[AUTO-DELETE] Media incompatible eliminada: ${absolutePath}`
            );
          }
        } catch (fsErr) {
          console.error(
            `[AUTO-DELETE] Error al eliminar archivo físico: ${fsErr.message}`
          );
        }

        // Eliminar de la base de datos
        await prisma.media.delete({ where: { id: media.id } });

        deletedFiles.push({
          id: media.id,
          url: media.url,
          type: media.media_type,
          reason: `Incompatible con tipo ${newContentType}`,
        });
      }
    }

    return deletedFiles;
  } catch (error) {
    console.error("[AUTO-DELETE] Error eliminando media incompatible:", error);
    return [];
  }
};

// ======================= CRUD BÁSICO Y ACCESO ADMIN =======================

/**
 * Obtiene TODAS las publicaciones para la vista de administrador
 */
export const getAllPublications = async () => {
  try {
    return await prisma.publications.findMany({
      include: {
        client: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        media: true,
        _count: {
          select: { comments: true },
        },
      },
      orderBy: { created_at: "desc" },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene todas las publicaciones de un cliente sin filtrar por estado (ADMIN)
 */
export const getAllPublicationsByClientId = async (clientId) => {
  try {
    return await prisma.publications.findMany({
      where: { client_id: clientId },
      include: {
        media: true,
        client: {
          select: { id: true, user_id: true, company_name: true },
        },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: { publish_date: "desc" },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene una publicación específica por su ID
 */
export const getPublicationById = async (publicationId) => {
  try {
    const publication = await prisma.publications.findUnique({
      where: { id: publicationId },
      include: {
        client: {
          select: { id: true, user_id: true, company_name: true },
        },
        media: true,
        _count: {
          select: { comments: true },
        },
      },
    });

    if (!publication) {
      throw new Error("Publicación no encontrada.");
    }

    return publication;
  } catch (error) {
    throw error;
  }
};

/**
 * Actualiza una publicación por su ID
 * Si se cambia el content_type, elimina automáticamente media incompatible
 */
export const updatePublication = async (publicationId, updateData) => {
  try {
    // Validar datos de entrada
    if (
      updateData.content_type &&
      !VALID_CONTENT_TYPES.includes(updateData.content_type)
    ) {
      throw new Error(
        "Tipo de contenido no válido. Solo se permite POST o REEL."
      );
    }

    if (updateData.status && !VALID_STATUSES.includes(updateData.status)) {
      throw new Error("Estado no válido. Use DRAFT, SCHEDULED o PUBLISHED.");
    }

    // Convertir fecha si se proporciona
    if (updateData.publish_date) {
      updateData.publish_date = new Date(updateData.publish_date);
    }

    // 🔥 NUEVO: Si se cambia el content_type, eliminar media incompatible
    let deletedMedia = [];
    if (updateData.content_type) {
      // Obtener la publicación actual para comparar
      const currentPublication = await prisma.publications.findUnique({
        where: { id: publicationId },
        select: { content_type: true },
      });

      // Si el content_type cambió, eliminar media incompatible
      if (
        currentPublication &&
        currentPublication.content_type !== updateData.content_type
      ) {
        deletedMedia = await deleteIncompatibleMedia(
          publicationId,
          updateData.content_type
        );

        // Si se eliminó media, revertir a DRAFT si estaba publicada/programada
        if (deletedMedia.length > 0 && !updateData.status) {
          updateData.status = "DRAFT";
        }
      }
    }

    const updatedPublication = await prisma.publications.update({
      where: { id: publicationId },
      data: updateData,
      include: {
        client: {
          select: { id: true, user_id: true, company_name: true },
        },
        media: true,
        _count: {
          select: { comments: true },
        },
      },
    });

    // Retornar publicación actualizada + info de archivos eliminados
    return {
      ...updatedPublication,
      deletedMedia: deletedMedia.length > 0 ? deletedMedia : undefined,
    };
  } catch (error) {
    if (error.code === "P2025") {
      throw new Error("Publicación no encontrada.");
    }
    throw error;
  }
};

/**
 * Elimina una publicación por su ID
 */
export const deletePublication = async (publicationId) => {
  try {
    const deletedPublication = await prisma.publications.delete({
      where: { id: publicationId },
      include: {
        client: {
          select: { id: true, user_id: true, company_name: true },
        },
      },
    });

    return deletedPublication;
  } catch (error) {
    if (error.code === "P2025") {
      throw new Error("Publicación no encontrada.");
    }
    throw error;
  }
};

/**
 * Actualiza solo el estado de una publicación
 */
export const updatePublicationStatus = async (publicationId, newStatus) => {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw new Error("Estado no válido. Use DRAFT, SCHEDULED o PUBLISHED.");
  }

  try {
    const updatedPublication = await prisma.publications.update({
      where: { id: publicationId },
      data: { status: newStatus },
      include: {
        client: {
          select: { id: true, user_id: true, company_name: true },
        },
        media: true,
        _count: {
          select: { comments: true },
        },
      },
    });

    return updatedPublication;
  } catch (error) {
    if (error.code === "P2025") {
      throw new Error("Publicación no encontrada.");
    }
    throw error;
  }
};

// ======================= CREACIÓN CON LÍMITE DE PLAN =======================

/**
 * Crea una nueva publicación con validación de límites según el plan del cliente
 */
export const createPublication = async (clientId, publicationData) => {
  const {
    title,
    content_type,
    publish_date,
    status = "DRAFT",
  } = publicationData;

  if (!VALID_CONTENT_TYPES.includes(content_type)) {
    throw new Error(
      "Tipo de contenido no válido. Solo se permite POST o REEL."
    );
  }

  if (!VALID_STATUSES.includes(status)) {
    throw new Error("Estado no válido. Use DRAFT, SCHEDULED o PUBLISHED.");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener el cliente y su plan
      const client = await tx.clients.findUnique({
        where: { id: clientId },
        select: { id: true, plan: true, status: true },
      });

      if (!client) {
        throw new Error("Cliente no encontrado");
      }

      if (!client.status) {
        throw new Error("Cliente inactivo. No puede crear publicaciones.");
      }

      // 2. Definir límites por plan
      const PLAN_LIMITS = {
        BASIC: { REEL: 4, POST: 8 },
        STANDARD: { REEL: 8, POST: 10 },
        FULL: { REEL: 15, POST: 15 },
      };

      const planLimits = PLAN_LIMITS[client.plan];

      // 3. Contar publicaciones actuales del tipo especificado
      const currentCount = await tx.publications.count({
        where: {
          client_id: clientId,
          content_type: content_type,
        },
      });

      if (currentCount >= planLimits[content_type]) {
        throw new Error(
          `Límite alcanzado para el tipo ${content_type}. Su plan ${client.plan} permite un máximo de ${planLimits[content_type]} ${content_type}s.`
        );
      }

      // 4. Crear publicación
      const newPublication = await tx.publications.create({
        data: {
          client_id: clientId,
          title,
          content_type,
          publish_date: publish_date ? new Date(publish_date) : new Date(),
          status,
        },
        include: {
          client: {
            select: { id: true, user_id: true, company_name: true },
          },
        },
      });

      return newPublication;
    });

    return result;
  } catch (error) {
    throw error;
  }
};

// ======================= ACCESO CLIENTE (FILTRADO) =======================

/**
 * Obtiene las publicaciones 'PUBLISHED' para un cliente (RF-010)
 * USADO POR: Dashboard para mostrar solo publicadas en vistas públicas
 */
export const getPublishedPublicationsByClientId = async (clientId) => {
  try {
    return await prisma.publications.findMany({
      where: {
        client_id: clientId,
        status: "PUBLISHED", // FILTRO CLAVE DE VISIBILIDAD
      },
      include: {
        media: true,
        _count: {
          select: { comments: true },
        },
      },
      orderBy: { publish_date: "desc" },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene TODAS las publicaciones de un cliente (sin filtrar por estado)
 * USADO POR: Vista de publicaciones del cliente (/my) para ver todas sus publicaciones
 */
export const getAllPublicationsByClient = async (clientId) => {
  try {
    return await prisma.publications.findMany({
      where: {
        client_id: clientId,
      },
      include: {
        media: true,
        _count: {
          select: { comments: true },
        },
      },
      orderBy: { publish_date: "desc" },
    });
  } catch (error) {
    throw error;
  }
};

// ======================= FUNCIONES AUXILIARES =======================

/**
 * Obtener cliente por user_id (usado para validaciones)
 */
export const getClientByUserId = async (userId) => {
  try {
    const client = await prisma.clients.findUnique({
      where: { user_id: userId },
      select: { id: true, user_id: true, status: true, plan: true },
    });

    return client;
  } catch (error) {
    throw error;
  }
};

/**
 * Obtener estadísticas de publicaciones por cliente
 */
export const getPublicationStats = async (clientId) => {
  try {
    const stats = await prisma.publications.groupBy({
      by: ["content_type", "status"],
      where: { client_id: clientId },
      _count: {
        id: true,
      },
    });

    return stats;
  } catch (error) {
    throw error;
  }
};
