// backend/src/modules/clients/controllers/client.controller.js
import * as clientService from "../services/client.service.js";
import { handleControllerError } from "../../../shared/utils/errorHandler.js";

/**
 * Obtener todos los clientes (Solo ADMIN)
 */
export const getAllClients = async (req, res) => {
  try {
    const clients = await clientService.getAllClients();
    res.status(200).json(clients);
  } catch (error) {
    handleControllerError(res, error, "Error al obtener la lista de clientes");
  }
};

/**
 * Obtener información del cliente actual (CLIENTE logueado)
 */
export const getMyClientInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const client = await clientService.getClientByUserId(userId);
    res.status(200).json(client);
  } catch (error) {
    handleControllerError(
      res,
      error,
      "Error al obtener tu información de cliente"
    );
  }
};

/**
 * Actualizar información del cliente actual (CLIENTE logueado)
 */
export const updateMyClientInfo = async (req, res) => {
  try {
    const userId = req.user.id;

    // Primero obtenemos el cliente para verificar que existe y obtener su ID
    const client = await clientService.getClientByUserId(userId);

    // Solo permitimos actualizar ciertos campos
    const allowedFields = [
      "company_name",
      "ruc",
      "contact_email",
      "contact_phone",
    ];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No se proporcionaron campos válidos para actualizar.",
      });
    }

    const updatedClient = await clientService.updateClient(client.id, updates);
    res.status(200).json({
      client: updatedClient,
      message: "Perfil actualizado exitosamente",
    });
  } catch (error) {
    handleControllerError(res, error, "Error al actualizar tu perfil");
  }
};

/**
 * Obtener cliente por ID (Solo ADMIN)
 */
export const getClientById = async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);

    if (isNaN(clientId) || clientId <= 0) {
      return res.status(400).json({ message: "ID de cliente inválido." });
    }

    const client = await clientService.getClientById(clientId);
    res.status(200).json(client);
  } catch (error) {
    handleControllerError(
      res,
      error,
      "Error al obtener la información del cliente"
    );
  }
};

/**
 * Obtener cliente por user_id (ADMIN o el propio cliente)
 */
export const getClientByUserId = async (req, res) => {
  try {
    const requestedUserId = parseInt(req.params.userId);
    const { id: currentUserId, role } = req.user;

    if (isNaN(requestedUserId)) {
      return res.status(400).json({ message: "ID de usuario inválido." });
    }

    // Verificar autorización: Solo ADMIN o el usuario actual
    if (role !== "ADMIN" && currentUserId !== requestedUserId) {
      return res.status(403).json({
        message: "Solo puedes ver tu propia información de cliente",
      });
    }

    const client = await clientService.getClientByUserId(requestedUserId);
    res.status(200).json(client);
  } catch (error) {
    handleControllerError(
      res,
      error,
      "Error al obtener la información del cliente"
    );
  }
};

/**
 * Obtener publicaciones de un cliente específico (Solo ADMIN)
 */
export const getClientPublications = async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);

    if (isNaN(clientId) || clientId <= 0) {
      return res.status(400).json({ message: "ID de cliente inválido." });
    }

    const publications = await clientService.getPublicationsByClientId(
      clientId
    );
    res.status(200).json(publications);
  } catch (error) {
    handleControllerError(
      res,
      error,
      "Error al obtener las publicaciones del cliente"
    );
  }
};

/**
 * Actualizar información del cliente (Solo ADMIN)
 */
export const updateClient = async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);

    if (isNaN(clientId) || clientId <= 0) {
      return res.status(400).json({ message: "ID de cliente inválido." });
    }

    const updatedClient = await clientService.updateClient(clientId, req.body);
    res.status(200).json({
      client: updatedClient,
      message: "Cliente actualizado exitosamente",
    });
  } catch (error) {
    handleControllerError(res, error, "Error al actualizar el cliente");
  }
};

/**
 * Cambiar estado del cliente (activo/inactivo) - Solo ADMIN
 */
export const toggleClientStatus = async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const { isActive } = req.body;

    if (isNaN(clientId) || clientId <= 0) {
      return res.status(400).json({ message: "ID de cliente inválido." });
    }

    // Validación del campo isActive
    if (isActive === undefined || typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "El campo 'isActive' (boolean) es requerido.",
      });
    }

    const updatedClient = await clientService.toggleClientStatus(
      clientId,
      isActive
    );
    res.status(200).json({
      client: updatedClient,
      message: "Estado del cliente actualizado correctamente",
    });
  } catch (error) {
    handleControllerError(res, error, "Error al cambiar el estado del cliente");
  }
};

/**
 * Eliminar cliente (Solo ADMIN)
 */
export const deleteClient = async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);

    if (isNaN(clientId) || clientId <= 0) {
      return res.status(400).json({ message: "ID de cliente inválido." });
    }

    const deletedClient = await clientService.deleteClient(clientId);
    res.status(200).json({
      message: "Cliente eliminado permanentemente",
      client: deletedClient,
    });
  } catch (error) {
    handleControllerError(res, error, "Error al eliminar el cliente");
  }
};
