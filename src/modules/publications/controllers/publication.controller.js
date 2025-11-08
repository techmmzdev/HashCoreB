// backend/src/modules/publications/controllers/publication.controller.js
import * as publicationService from "../services/publication.service.js";
import { handleControllerError } from "../../../shared/utils/errorHandler.js";

const VALID_CONTENT_TYPES = ["POST", "REEL"];
const VALID_STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHED"];

/**
 * Obtiene TODAS las publicaciones para el ADMIN
 */
export const getAllPublications = async (req, res) => {
  try {
    const publications = await publicationService.getAllPublications();
    res.status(200).json(publications);
  } catch (error) {
    handleControllerError(
      res,
      error,
      "Error al obtener todas las publicaciones"
    );
  }
};

/**
 * Crea una nueva publicación para un cliente específico (SOLO ADMIN)
 */
export const createPublication = async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const { content_type } = req.body;

    // Validaciones de entrada
    if (isNaN(clientId)) {
      return res.status(400).json({ message: "ID de cliente inválido." });
    }

    if (!VALID_CONTENT_TYPES.includes(content_type)) {
      return res.status(400).json({ message: "Tipo de contenido no válido." });
    }

    const newPublication = await publicationService.createPublication(
      clientId,
      req.body
    );

    res.status(201).json({
      publication: newPublication,
      message: "Publicación creada exitosamente",
    });
  } catch (error) {
    // Manejo específico del límite de plan
    if (error.message.includes("Límite alcanzado")) {
      return res.status(403).json({ message: error.message });
    }
    if (error.message.includes("Cliente inactivo")) {
      return res.status(403).json({ message: error.message });
    }
    handleControllerError(res, error, "Error al crear la publicación");
  }
};

/**
 * Obtiene publicaciones de un cliente (ADMIN ve todas, CLIENTE ve todas las suyas)
 */
export const getClientPublications = async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const { id: userId, role: userRole, clientId: userClientId } = req.user;

    if (isNaN(clientId)) {
      return res.status(400).json({ message: "ID de cliente inválido." });
    }

    let publications;

    if (userRole === "ADMIN") {
      // ADMIN: Ve todas las publicaciones
      publications = await publicationService.getAllPublicationsByClientId(
        clientId
      );
    } else {
      // CLIENTE: Validación de propiedad
      if (clientId !== userClientId) {
        return res.status(403).json({
          message: "No tienes permiso para ver estas publicaciones.",
        });
      }
      // CLIENTE: Ahora ve TODAS sus publicaciones (DRAFT, SCHEDULED, PUBLISHED)
      publications = await publicationService.getAllPublicationsByClient(
        clientId
      );
    }

    res.status(200).json(publications);
  } catch (error) {
    handleControllerError(res, error, "Error al obtener las publicaciones");
  }
};

/**
 * Obtiene publicaciones del cliente actual (para panel de cliente)
 * Retorna TODAS las publicaciones (DRAFT, SCHEDULED, PUBLISHED)
 */
export const getMyPublications = async (req, res) => {
  try {
    const { id: userId, role, clientId } = req.user;

    if (role !== "CLIENTE" || !clientId) {
      return res.status(403).json({
        message: "Solo los clientes pueden acceder a sus publicaciones.",
      });
    }

    // Cambio: ahora retorna TODAS las publicaciones del cliente
    const publications = await publicationService.getAllPublicationsByClient(
      clientId
    );
    res.status(200).json(publications);
  } catch (error) {
    handleControllerError(res, error, "Error al obtener tus publicaciones");
  }
};

/**
 * Obtiene una publicación por ID con validación de permisos
 */
export const getPublicationById = async (req, res) => {
  try {
    const publicationId = parseInt(req.params.id);
    const { role: userRole, clientId: userClientId } = req.user;

    if (isNaN(publicationId)) {
      return res.status(400).json({ message: "ID de publicación inválido." });
    }

    const publication = await publicationService.getPublicationById(
      publicationId
    );

    // Lógica de autorización
    if (userRole !== "ADMIN") {
      // CLIENTE debe ser el dueño
      if (publication.client_id !== userClientId) {
        return res.status(403).json({
          message: "No tienes permiso para ver esta publicación.",
        });
      }
      // Cliente solo ve contenido PUBLISHED
      if (publication.status !== "PUBLISHED") {
        return res.status(403).json({
          message: "La publicación no está disponible para su visualización.",
        });
      }
    }

    res.status(200).json(publication);
  } catch (error) {
    handleControllerError(res, error, "Error al obtener la publicación");
  }
};

/**
 * Actualiza una publicación (SOLO ADMIN)
 */
export const updatePublication = async (req, res) => {
  try {
    const publicationId = parseInt(req.params.id);
    const { content_type } = req.body;

    if (isNaN(publicationId)) {
      return res.status(400).json({ message: "ID de publicación inválido." });
    }

    // Validación de entrada
    if (content_type && !VALID_CONTENT_TYPES.includes(content_type)) {
      return res.status(400).json({ message: "Tipo de contenido no válido." });
    }

    const result = await publicationService.updatePublication(
      publicationId,
      req.body
    );

    // Extraer deletedMedia si existe
    const { deletedMedia, ...updatedPublication } = result;

    // Preparar respuesta
    const response = {
      publication: updatedPublication,
      message: "Publicación actualizada exitosamente",
    };

    // Si se eliminaron archivos, agregar información
    if (deletedMedia && deletedMedia.length > 0) {
      response.deletedMedia = deletedMedia;
      response.warning = `Se eliminaron ${deletedMedia.length} archivo(s) incompatible(s) con el nuevo tipo de contenido.`;
    }

    res.status(200).json(response);
  } catch (error) {
    handleControllerError(res, error, "Error al actualizar la publicación");
  }
};

/**
 * Elimina una publicación (SOLO ADMIN)
 */
export const deletePublication = async (req, res) => {
  try {
    const publicationId = parseInt(req.params.id);

    if (isNaN(publicationId)) {
      return res.status(400).json({ message: "ID de publicación inválido." });
    }

    await publicationService.deletePublication(publicationId);
    res.status(200).json({ message: "Publicación eliminada correctamente" });
  } catch (error) {
    handleControllerError(res, error, "Error al eliminar la publicación");
  }
};

/**
 * Actualiza solo el estado de una publicación (SOLO ADMIN)
 */
export const updatePublicationStatus = async (req, res) => {
  try {
    const publicationId = parseInt(req.params.id);
    const { status: newStatus } = req.body;

    if (isNaN(publicationId)) {
      return res.status(400).json({ message: "ID de publicación inválido." });
    }

    if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
      return res.status(400).json({
        message: "Estado no válido. Use: " + VALID_STATUSES.join(", "),
      });
    }

    const updatedPublication = await publicationService.updatePublicationStatus(
      publicationId,
      newStatus
    );

    res.status(200).json({
      publication: updatedPublication,
      message: `Estado actualizado a ${newStatus} exitosamente.`,
    });
  } catch (error) {
    handleControllerError(res, error, "Error al actualizar el estado");
  }
};

/**
 * Obtener estadísticas de publicaciones para un cliente (ADMIN o el propio cliente)
 */
export const getPublicationStats = async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const { role: userRole, clientId: userClientId } = req.user;

    if (isNaN(clientId)) {
      return res.status(400).json({ message: "ID de cliente inválido." });
    }

    // Verificar autorización
    if (userRole !== "ADMIN" && clientId !== userClientId) {
      return res.status(403).json({
        message: "No tienes permiso para ver estas estadísticas.",
      });
    }

    const stats = await publicationService.getPublicationStats(clientId);
    res.status(200).json(stats);
  } catch (error) {
    handleControllerError(res, error, "Error al obtener estadísticas");
  }
};
