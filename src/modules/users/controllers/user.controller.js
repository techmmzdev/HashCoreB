// backend/src/modules/users/controllers/user.controller.js
import * as userService from "../services/user.service.js";
import { handleControllerError } from "../../../shared/utils/errorHandler.js";

/**
 * Crear usuario básico (solo admin)
 */
export const createUser = async (req, res) => {
  try {
    const newUser = await userService.createUser(req.body);
    const { password, ...userWithoutPassword } = newUser;

    res.status(201).json({
      user: userWithoutPassword,
      message: "Usuario creado exitosamente",
    });
  } catch (error) {
    handleControllerError(res, error, "Error al crear el usuario");
  }
};

/**
 * Crear usuario con información de cliente (solo admin)
 */
export const createUserWithClient = async (req, res) => {
  try {
    const newUser = await userService.createUserWithClient(req.body);
    const { password, ...userWithoutPassword } = newUser;

    res.status(201).json({
      user: userWithoutPassword,
      message: "Usuario y cliente creados exitosamente",
    });
  } catch (error) {
    handleControllerError(res, error, "Error al crear el usuario con cliente");
  }
};

/**
 * Obtener todos los usuarios (solo admin)
 */
export const getUsers = async (req, res) => {
  try {
    const users = await userService.getUsers();
    const usersWithoutPasswords = users.map(({ password, ...u }) => u);

    res.status(200).json(usersWithoutPasswords);
  } catch (error) {
    handleControllerError(res, error, "Error al obtener los usuarios");
  }
};

/**
 * Obtener usuario por ID (admin o el propio usuario)
 */
export const getUserById = async (req, res) => {
  try {
    const requestedUserId = parseInt(req.params.id);
    const { id: currentUserId, role } = req.user;

    if (isNaN(requestedUserId)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    // Verificar autorización: Solo ADMIN o el usuario actual
    if (role !== "ADMIN" && currentUserId !== requestedUserId) {
      return res.status(403).json({
        message: "No tienes permiso para ver esta información",
      });
    }

    const user = await userService.getUserById(requestedUserId);
    const { password, ...userWithoutPassword } = user;

    res.status(200).json(userWithoutPassword);
  } catch (error) {
    handleControllerError(res, error, "Error al obtener el usuario");
  }
};

/**
 * Actualizar usuario básico (admin o el propio usuario)
 */
export const updateUser = async (req, res) => {
  try {
    const requestedUserId = parseInt(req.params.id);
    const { id: currentUserId, role } = req.user;

    if (isNaN(requestedUserId)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    // Verificar autorización: Solo ADMIN o el usuario actual
    if (role !== "ADMIN" && currentUserId !== requestedUserId) {
      return res.status(403).json({
        message: "Solo puedes actualizar tu propia información",
      });
    }

    // Seguridad: Los clientes no pueden cambiar su propio rol
    if (role === "CLIENTE" && req.body.role && req.body.role !== "CLIENTE") {
      return res.status(403).json({
        message: "No puedes cambiar tu rol",
      });
    }

    const updatedUser = await userService.updateUser(requestedUserId, req.body);
    const { password, ...userWithoutPassword } = updatedUser;

    res.status(200).json(userWithoutPassword);
  } catch (error) {
    handleControllerError(res, error, "Error al actualizar el usuario");
  }
};

/**
 * Actualizar usuario con información de cliente (admin o el propio usuario)
 */
export const updateUserWithClient = async (req, res) => {
  try {
    const requestedUserId = parseInt(req.params.id);
    const { id: currentUserId, role } = req.user;

    if (isNaN(requestedUserId)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    // Verificar autorización
    if (role !== "ADMIN" && currentUserId !== requestedUserId) {
      return res.status(403).json({
        message: "Solo puedes actualizar tu propia información",
      });
    }

    // Seguridad: Los clientes no pueden cambiar su propio rol
    if (role === "CLIENTE" && req.body.role && req.body.role !== "CLIENTE") {
      return res.status(403).json({
        message: "No puedes cambiar tu rol",
      });
    }

    const updatedUser = await userService.updateUserWithClient(
      requestedUserId,
      req.body
    );
    const { password, ...userWithoutPassword } = updatedUser;

    res.status(200).json(userWithoutPassword);
  } catch (error) {
    handleControllerError(
      res,
      error,
      "Error al actualizar el usuario y cliente"
    );
  }
};

/**
 * Eliminar usuario (solo admin)
 */
export const deleteUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    await userService.deleteUser(userId);
    res.status(200).json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    handleControllerError(res, error, "Error al eliminar el usuario");
  }
};

/**
 * Obtener perfil del usuario actual
 */
export const getMyProfile = async (req, res) => {
  try {
    const user = await userService.getUserById(req.user.id);
    const { password, ...userWithoutPassword } = user;

    res.status(200).json(userWithoutPassword);
  } catch (error) {
    handleControllerError(res, error, "Error al obtener el perfil");
  }
};

/**
 * Cambiar contraseña del usuario actual
 */
export const changeMyPassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validaciones
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Se requiere la contraseña actual y la nueva contraseña",
      });
    }

    if (newPassword.length < 20) {
      return res.status(400).json({
        message: "La nueva contraseña debe tener al menos 20 caracteres",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "La nueva contraseña debe ser diferente a la actual",
      });
    }

    await userService.changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      message: "Contraseña actualizada exitosamente",
    });
  } catch (error) {
    handleControllerError(res, error, "Error al cambiar la contraseña");
  }
};
