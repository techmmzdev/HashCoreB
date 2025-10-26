// backend/src/modules/auth/controllers/auth.controller.js
import * as authService from "../services/auth.service.js";
import { handleControllerError } from "../../../shared/utils/errorHandler.js";

/**
 * Iniciar sesión
 */
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Validaciones básicas
  if (!email || !password) {
    return res.status(400).json({
      message: "Email y contraseña son requeridos",
    });
  }

  try {
    const { token, user } = await authService.loginUser(email, password);

    // No incluir la contraseña en la respuesta
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      token,
      user: userWithoutPassword,
      message: "Inicio de sesión exitoso",
    });
  } catch (error) {
    // Mapear mensajes específicos del servicio
    if (error.message?.includes("Credenciales inválidas")) {
      return res.status(401).json({ message: error.message });
    }
    if (error.message?.includes("Usuario no encontrado")) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message?.includes("inactiva")) {
      return res.status(403).json({ message: error.message });
    }

    handleControllerError(res, error, "Error interno al iniciar sesión");
  }
};

/**
 * Verificar token actual
 */
export const verifyToken = async (req, res) => {
  try {
    // El middleware ya verificó el token, solo devolvemos los datos del usuario
    const { password, ...userWithoutPassword } = req.user;
    res.status(200).json({
      user: userWithoutPassword,
      message: "Token válido",
    });
  } catch (error) {
    handleControllerError(res, error, "Error al verificar token");
  }
};

/**
 * Refrescar token
 */
export const refreshToken = async (req, res) => {
  try {
    const newToken = await authService.refreshToken(req.user.id);
    res.status(200).json({
      token: newToken,
      message: "Token renovado exitosamente",
    });
  } catch (error) {
    handleControllerError(res, error, "Error al renovar token");
  }
};

/**
 * Cerrar sesión (opcional - para blacklist de tokens)
 */
export const logout = async (req, res) => {
  try {
    // Por ahora solo enviamos mensaje de éxito
    // En el futuro se puede implementar blacklist de tokens
    res.status(200).json({
      message: "Sesión cerrada exitosamente",
    });
  } catch (error) {
    handleControllerError(res, error, "Error al cerrar sesión");
  }
};
