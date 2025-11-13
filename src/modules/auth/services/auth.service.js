// backend/src/modules/auth/services/auth.service.js
import { getPrisma } from "../../../config/db.js";
import { ENV } from "../../../config/env.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = getPrisma();

/**
 * Generar JWT para un usuario autenticado
 */
export const generateToken = async (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clientId: user.clients?.[0]?.id || null,
    companyName: user.clients?.[0]?.company_name || null,
    plan: user.clients?.[0]?.plan || null,
  };

  try {
    return jwt.sign(payload, ENV.jwtSecret, { expiresIn: ENV.jwtExpiresIn });
  } catch (error) {
    throw new Error("Error interno al generar el token");
  }
};

/**
 * Autenticar usuario con email y contraseña
 */
export const loginUser = async (email, password) => {
  try {
    const user = await prisma.users.findUnique({
      where: { email },
      include: { clients: true },
    });

    if (!user) throw new Error("Usuario no encontrado");

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new Error("Contraseña Incorrecta");

    if (user.role === "CLIENTE") {
      const client = user.clients?.[0];
      if (client && client.status === false) {
        throw new Error("Cuenta inactiva. Contacta al administrador.");
      }
    }

    const token = await generateToken(user);

    // 🔧 Aquí simplificamos el usuario para el frontend
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      clientId: user.clients?.[0]?.id || null,
      companyName: user.clients?.[0]?.company_name || null,
      plan: user.clients?.[0]?.plan || null,
    };

    return { token, user: userData };
  } catch (error) {
    throw error;
  }
};

/**
 * Verificar si un token es válido
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, ENV.jwtSecret);
  } catch (error) {
    throw new Error("Token inválido o expirado");
  }
};

/**
 * Validar refresh token y emitir nuevo access token
 */
export const refreshToken = async (refreshToken) => {
  try {
    // Verificar refresh token
    const payload = jwt.verify(refreshToken, ENV.jwtRefreshSecret);
    // Buscar usuario
    const user = await prisma.users.findUnique({
      where: { id: payload.id },
      include: { clients: true },
    });
    if (!user) throw new Error("Usuario no encontrado");
    // Emitir nuevo access token
    const token = await generateToken(user);
    // Simplificar usuario para frontend
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      clientId: user.clients?.[0]?.id || null,
      companyName: user.clients?.[0]?.company_name || null,
      plan: user.clients?.[0]?.plan || null,
    };
    return { token, user: userData };
  } catch (error) {
    throw new Error("Refresh token inválido o expirado");
  }
};
