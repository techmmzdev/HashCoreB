// backend/src/modules/media/services/media.service.js
import { getPrisma } from "../../../config/db.js";
import fs from "fs";
import path from "path";

const prisma = getPrisma();

/**
 * Crear media y asociarla a una publicación
 * @param {number} publicationId - ID de la publicación
 * @param {object} mediaData - Datos del archivo multimedia
 * @returns {Promise<object>} - Media creada
 */
export const createMedia = async (publicationId, mediaData) => {
  try {
    // 1. Verificar que la publicación exista
    const publication = await prisma.publications.findUnique({
      where: { id: publicationId },
    });

    if (!publication) {
      throw new Error("La publicación especificada no existe.");
    }

    // 2. Validación defensiva: comprobar que el mime-type corresponda al content_type
    const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    const videoTypes = ["video/mp4", "video/webm"];

    const contentType = (publication.content_type || "").toUpperCase();
    const mime = (mediaData.media_type || "").toLowerCase();

    if (contentType === "REEL" && !videoTypes.includes(mime)) {
      throw new Error("Tipo de archivo inválido para REEL: se requiere video.");
    }

    if (contentType === "POST" && !imageTypes.includes(mime)) {
      throw new Error(
        "Tipo de archivo inválido para POST: se requiere imagen."
      );
    }

    // 3. Crear registro de media
    return await prisma.media.create({
      data: {
        publication_id: publicationId,
        media_type: mediaData.media_type,
        url: mediaData.url,
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Obtener media de una publicación
 * @param {number} publicationId - ID de la publicación
 * @returns {Promise<array>} - Lista de media
 */
export const getMediaByPublicationId = async (publicationId) => {
  try {
    const media = await prisma.media.findMany({
      where: { publication_id: publicationId },
      orderBy: { created_at: "asc" },
    });
    return media;
  } catch (error) {
    throw error;
  }
};

/**
 * Obtener una media específica por ID
 * @param {number} mediaId - ID de la media
 * @returns {Promise<object|null>} - Media encontrada o null
 */
export const getMediaById = async (mediaId) => {
  try {
    return await prisma.media.findUnique({
      where: { id: mediaId },
      include: {
        publication: {
          select: {
            id: true,
            client_id: true,
            content_type: true,
            status: true,
          },
        },
      },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Eliminar media física y de la base de datos
 * @param {number} publicationId - ID de la publicación
 * @param {number} mediaId - ID de la media
 * @returns {Promise<object|null>} - Resultado de la eliminación
 */
export const deleteMedia = async (publicationId, mediaId) => {
  try {
    const media = await prisma.media.findFirst({
      where: {
        id: parseInt(mediaId),
        publication_id: parseInt(publicationId),
      },
      include: {
        publication: true,
      },
    });

    if (!media) {
      return null;
    }

    // Eliminar archivo físico
    const uploadsDir = path.join(process.cwd(), "uploads");
    const absolutePath = path.join(uploadsDir, media.url);

    try {
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
        console.info(`Media removed from disk: ${absolutePath}`);
      } else {
        console.warn(
          `Media file not found on disk (skipping): ${absolutePath}`
        );
      }
    } catch (fsErr) {
      console.error("Error removing media file from disk:", fsErr);
    }

    // Eliminar registro en DB
    await prisma.media.delete({ where: { id: media.id } });

    // Contar media restantes para esta publicación
    const remaining = await prisma.media.count({
      where: { publication_id: media.publication_id },
    });

    let publicationUpdated = null;
    if (remaining === 0) {
      // Si no quedan archivos multimedia y la publicación está publicada o programada,
      // revertir a DRAFT
      if (
        media.publication &&
        ["PUBLISHED", "SCHEDULED"].includes(media.publication.status)
      ) {
        publicationUpdated = await prisma.publications.update({
          where: { id: media.publication_id },
          data: { status: "DRAFT" },
        });
      }
    }

    return {
      deleted: true,
      media,
      publication: publicationUpdated,
      remainingMedia: remaining,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Obtener estadísticas de media para una publicación
 * @param {number} publicationId - ID de la publicación
 * @returns {Promise<object>} - Estadísticas de media
 */
export const getMediaStats = async (publicationId) => {
  try {
    const [totalMedia, imageCount, videoCount] = await Promise.all([
      prisma.media.count({
        where: { publication_id: publicationId },
      }),
      prisma.media.count({
        where: {
          publication_id: publicationId,
          media_type: { startsWith: "image/" },
        },
      }),
      prisma.media.count({
        where: {
          publication_id: publicationId,
          media_type: { startsWith: "video/" },
        },
      }),
    ]);

    return {
      total: totalMedia,
      images: imageCount,
      videos: videoCount,
    };
  } catch (error) {
    throw error;
  }
};
