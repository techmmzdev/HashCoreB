// backend/src/modules/media/controllers/media.controller.js
import * as mediaService from "../services/media.service.js";
import * as publicationService from "../../publications/services/publication.service.js";
import { handleControllerError } from "../../../shared/utils/errorHandler.js";
import { ENV } from "../../../config/env.js";
import path from "path";
import fs from "fs";

// Función auxiliar para limpiar archivos en caso de error
const cleanupFile = (file) => {
  if (file && file.path) {
    fs.unlink(file.path, (err) => {
      if (err) console.error("Error al limpiar archivo fallido:", err);
    });
  }
};

/**
 * Subir un nuevo archivo multimedia (SOLO ADMIN)
 */
export const uploadMedia = async (req, res) => {
  try {
    const publicationId = parseInt(req.params.publicationId);
    if (isNaN(publicationId)) {
      return res.status(400).json({ message: "ID de publicación inválido." });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No se encontró ningún archivo para subir." });
    }

    // Validar publicación existente
    const publication = await publicationService.getPublicationById(
      publicationId
    );
    if (!publication) {
      cleanupFile(req.file);
      return res.status(404).json({ message: "Publicación no encontrada." });
    }

    // Validar tipo MIME según el tipo de publicación
    const imageMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
    ];
    const videoMimeTypes = ["video/mp4", "video/webm"];
    const contentType = (publication.content_type || "").toUpperCase();

    if (contentType === "REEL" && !videoMimeTypes.includes(req.file.mimetype)) {
      cleanupFile(req.file);
      return res
        .status(400)
        .json({ message: "Esta publicación requiere un video (REEL)." });
    }

    if (contentType === "POST" && !imageMimeTypes.includes(req.file.mimetype)) {
      cleanupFile(req.file);
      return res
        .status(400)
        .json({ message: "Esta publicación requiere una imagen (POST)." });
    }

    // ====== SUBIDA DINÁMICA (local o Supabase) ======
    const isDev = ENV.node === "development";
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileName = `${Date.now()}_${req.file.originalname}`;
    const mimeType = req.file.mimetype;

    // Usa la función híbrida (detecta entorno internamente)
    const fileUrl = await mediaService.uploadToSupabase(
      fileBuffer,
      fileName,
      mimeType
    );

    cleanupFile(req.file);

    const mediaData = {
      media_type: mimeType,
      url: fileUrl, // URL local o pública de Supabase
    };

    const newMedia = await mediaService.createMedia(publicationId, mediaData);

    // ====== PUBLICAR AUTOMÁTICAMENTE SI SE SOLICITÓ ======
    const publishNow = req.query?.publishNow === "true";

    if (publishNow) {
      if ((publication.status || "").toUpperCase() === "DRAFT") {
        await publicationService.updatePublication(publicationId, {
          status: "PUBLISHED",
          publish_date: new Date(),
        });

        const updatedPublication = await publicationService.getPublicationById(
          publicationId
        );
        return res.status(201).json({
          media: newMedia,
          published: true,
          publication: updatedPublication,
          message: "Material multimedia subido y publicación publicada.",
        });
      }

      // Si ya estaba SCHEDULED
      return res.status(201).json({
        media: newMedia,
        published: false,
        message: "Material multimedia subido. La publicación está programada.",
      });
    }

    // ====== RESPUESTA NORMAL ======
    const currentPublication = await publicationService.getPublicationById(
      publicationId
    );
    res.status(201).json({
      media: newMedia,
      published: false,
      publication: currentPublication,
      message: "Material multimedia subido exitosamente.",
    });
  } catch (error) {
    cleanupFile(req.file);
    handleControllerError(res, error, "Error al subir el material multimedia");
  }
};

/**
 * Obtener material multimedia de una publicación
 */
export const getMedia = async (req, res) => {
  try {
    const publicationId = parseInt(req.params.publicationId);
    const { role: userRole, clientId: userClientId } = req.user;

    if (isNaN(publicationId)) {
      return res.status(400).json({ message: "ID de publicación inválido." });
    }

    // Obtener publicación para verificar existencia y propietario
    const publication = await publicationService.getPublicationById(
      publicationId
    );

    if (!publication) {
      return res.status(404).json({ message: "Publicación no encontrada." });
    }

    // Lógica de autorización: Solo ADMIN o DUEÑO
    if (userRole !== "ADMIN") {
      // Si el cliente no es el dueño
      if (publication.client_id !== userClientId) {
        return res
          .status(403)
          .json({ message: "No tienes permiso para acceder a este recurso." });
      }
    }

    // Obtener media
    const media = await mediaService.getMediaByPublicationId(publicationId);
    res.status(200).json(media);
  } catch (error) {
    handleControllerError(res, error, "Error al obtener material multimedia");
  }
};

/**
 * Obtener estadísticas de media para una publicación
 */
export const getMediaStats = async (req, res) => {
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
      return res
        .status(403)
        .json({ message: "No tienes permiso para acceder a este recurso." });
    }

    const stats = await mediaService.getMediaStats(publicationId);
    res.status(200).json(stats);
  } catch (error) {
    handleControllerError(
      res,
      error,
      "Error al obtener estadísticas de multimedia"
    );
  }
};

/**
 * Eliminar un archivo multimedia por ID (SOLO ADMIN)
 */
export const deleteMedia = async (req, res) => {
  try {
    const { publicationId, mediaId } = req.params;

    // Validación de entrada
    if (isNaN(parseInt(publicationId)) || isNaN(parseInt(mediaId))) {
      return res
        .status(400)
        .json({ message: "IDs de publicación o multimedia inválidos." });
    }

    const result = await mediaService.deleteMedia(publicationId, mediaId);

    if (!result) {
      return res
        .status(404)
        .json({ message: "Material multimedia no encontrado." });
    }

    // Si el servicio devolvió una publicación actualizada, informamos al cliente
    if (result.publication) {
      return res.status(200).json({
        message:
          "Material multimedia eliminado. La publicación se ha revertido a borrador.",
        media: result.media,
        publication: result.publication,
        reverted: true,
        remainingMedia: result.remainingMedia,
      });
    }

    res.status(200).json({
      message: "Material multimedia eliminado correctamente.",
      media: result.media,
      reverted: false,
      remainingMedia: result.remainingMedia,
    });
  } catch (error) {
    handleControllerError(res, error, "Error al eliminar material multimedia");
  }
};
