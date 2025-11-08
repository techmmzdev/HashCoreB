// backend/src/modules/users/services/user.service.js
import { getPrisma } from "../../../config/db.js";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";

const prisma = getPrisma();
const VALID_ROLES = ["ADMIN", "CLIENTE"];

/**
 * Crear un nuevo usuario
 */
export const createUser = async (userData) => {
  const { email, password, role, name } = userData;

  // Validaciones básicas
  if (!email || !password || !role || !name) {
    throw new Error("Email, contraseña, rol y nombre son requeridos");
  }

  if (!VALID_ROLES.includes(role)) {
    throw new Error("Rol no válido. Use ADMIN o CLIENTE");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.users.create({
      data: {
        email,
        password: hashedPassword,
        role,
        name,
      },
      include: { clients: true },
    });

    return newUser;
  } catch (error) {
    if (error.code === "P2002") {
      throw new Error("El email ya está registrado");
    }
    throw error;
  }
};

/**
 * Crear un nuevo usuario con información de cliente
 */
export const createUserWithClient = async (userData) => {
  const VALID_PLANS = ["BASIC", "STANDARD", "FULL"];
  const {
    email,
    password,
    name,
    company_name,
    ruc,
    contact_email,
    contact_phone,
    plan,
  } = userData;

  // Validaciones básicas
  if (!email || !password || !name || !company_name) {
    throw new Error(
      "Email, contraseña, nombre y nombre de compañía son requeridos"
    );
  }

  if (plan && !VALID_PLANS.includes(plan)) {
    throw new Error("Plan no válido. Use BASIC, STANDARD o FULL");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario y cliente en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear usuario con rol CLIENTE
      const newUser = await tx.users.create({
        data: {
          email,
          password: hashedPassword,
          role: "CLIENTE",
          name,
        },
      });

      // Crear entrada de cliente
      await tx.clients.create({
        data: {
          user_id: newUser.id,
          company_name,
          ruc: ruc || "",
          contact_email: contact_email || email,
          contact_phone: contact_phone || "",
          plan: plan || "BASIC",
          status: true,
        },
      });

      // Retornar usuario con cliente incluido
      const userWithClient = await tx.users.findUnique({
        where: { id: newUser.id },
        include: { clients: true },
      });

      return userWithClient;
    });

    return result;
  } catch (error) {
    if (error.code === "P2002") {
      throw new Error("El email ya está registrado");
    }
    throw error;
  }
};

/**
 * Obtener todos los usuarios
 */
export const getUsers = async () => {
  try {
    return await prisma.users.findMany({
      include: {
        clients: true,
        _count: {
          select: {
            comments: true,
            calendarNotes: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Obtener usuario por ID
 */
export const getUserById = async (id) => {
  const userId = Number(id);
  if (Number.isNaN(userId)) {
    throw new Error("ID inválido");
  }

  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        clients: true,
        _count: {
          select: {
            comments: true,
            calendarNotes: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    return user;
  } catch (error) {
    throw error;
  }
};

/**
 * Actualizar usuario básico (sin información de cliente)
 */
export const updateUser = async (id, userData) => {
  const userId = Number(id);
  if (Number.isNaN(userId)) {
    throw new Error("ID inválido");
  }

  const { email, password, role, name } = userData;

  // Validar rol si se proporciona
  if (role && !VALID_ROLES.includes(role)) {
    throw new Error("Rol no válido. Use ADMIN o CLIENTE");
  }

  try {
    const userUpdateData = {};
    if (email !== undefined) userUpdateData.email = email;
    if (role !== undefined) userUpdateData.role = role;
    if (name !== undefined) userUpdateData.name = name;
    if (password) userUpdateData.password = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      // Verificar que el usuario existe
      const existingUser = await tx.users.findUnique({
        where: { id: userId },
        include: { clients: true },
      });

      if (!existingUser) {
        throw new Error("Usuario no encontrado");
      }

      // Actualizar usuario
      const updatedUser = await tx.users.update({
        where: { id: userId },
        data: userUpdateData,
        include: { clients: true },
      });

      // Si el rol cambió de CLIENTE a otro, eliminar entrada de cliente
      if (existingUser.role === "CLIENTE" && role && role !== "CLIENTE") {
        await tx.clients.deleteMany({ where: { user_id: userId } });
      }

      return updatedUser;
    });

    return result;
  } catch (error) {
    if (error.code === "P2002") {
      throw new Error("El email ya está registrado");
    }
    throw error;
  }
};

/**
 * Actualizar usuario con información de cliente
 */
export const updateUserWithClient = async (id, userData) => {
  const VALID_PLANS = ["BASIC", "STANDARD", "FULL"];
  const userId = Number(id);
  if (Number.isNaN(userId)) {
    throw new Error("ID inválido");
  }

  const {
    email,
    password,
    name,
    company_name,
    ruc,
    contact_email,
    contact_phone,
    plan,
    status,
  } = userData;

  // Validar plan si se proporciona
  if (plan && !VALID_PLANS.includes(plan)) {
    throw new Error("Plan no válido. Use BASIC, STANDARD o FULL");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Verificar que el usuario existe
      const existingUser = await tx.users.findUnique({
        where: { id: userId },
        include: { clients: true },
      });

      if (!existingUser) {
        throw new Error("Usuario no encontrado");
      }

      // Preparar datos de actualización de usuario
      const userUpdateData = {};
      if (email !== undefined) userUpdateData.email = email;
      if (name !== undefined) userUpdateData.name = name;
      if (password) userUpdateData.password = await bcrypt.hash(password, 10);
      // Forzar rol CLIENTE
      userUpdateData.role = "CLIENTE";

      // Actualizar usuario
      const updatedUser = await tx.users.update({
        where: { id: userId },
        data: userUpdateData,
      });

      // Preparar datos de actualización de cliente
      const clientUpdateData = {};
      if (company_name !== undefined)
        clientUpdateData.company_name = company_name;
      if (ruc !== undefined) clientUpdateData.ruc = ruc;
      if (contact_email !== undefined)
        clientUpdateData.contact_email = contact_email;
      if (contact_phone !== undefined)
        clientUpdateData.contact_phone = contact_phone;
      if (plan !== undefined) clientUpdateData.plan = plan;
      if (status !== undefined) clientUpdateData.status = Boolean(status);

      // Actualizar o crear cliente
      const existingClient = existingUser.clients?.[0];
      if (existingClient) {
        // Actualizar cliente existente
        await tx.clients.update({
          where: { user_id: userId },
          data: clientUpdateData,
        });
      } else {
        // Crear nuevo cliente si no existe
        await tx.clients.create({
          data: {
            user_id: userId,
            company_name: company_name || "",
            ruc: ruc || "",
            contact_email: contact_email || email || "",
            contact_phone: contact_phone || "",
            plan: plan || "BASIC",
            status: status !== undefined ? Boolean(status) : true,
          },
        });
      }

      // Retornar usuario actualizado con cliente
      const finalUser = await tx.users.findUnique({
        where: { id: userId },
        include: { clients: true },
      });

      return finalUser;
    });

    return result;
  } catch (error) {
    if (error.code === "P2002") {
      throw new Error("El email ya está registrado");
    }
    throw error;
  }
};

/**
 * Eliminar usuario y limpiar archivos asociados
 */
export const deleteUser = async (id) => {
  const userId = Number(id);
  if (Number.isNaN(userId)) {
    throw new Error("ID inválido");
  }

  try {
    // Buscar usuario y sus archivos asociados
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        clients: {
          include: {
            publications: {
              include: { media: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // Recolectar archivos para eliminar
    const mediaFiles = [];
    if (user.clients?.length > 0) {
      user.clients.forEach((client) => {
        client.publications.forEach((publication) => {
          publication.media.forEach((media) => {
            if (media.url) {
              mediaFiles.push(media.url);
            }
          });
        });
      });
    }

    // Eliminar archivos físicos
    const uploadsDir = path.join(process.cwd(), "uploads");
    await Promise.all(
      mediaFiles.map(async (url) => {
        // Limpiar la URL para obtener solo el nombre del archivo
        const fileName = url.startsWith("/uploads/")
          ? url.replace("/uploads/", "")
          : url.startsWith("uploads/")
          ? url.replace("uploads/", "")
          : url.replace(/^\//, "");

        const absolutePath = path.join(uploadsDir, fileName);
        try {
          if (fs.existsSync(absolutePath)) {
            await fs.promises.unlink(absolutePath);
            console.info(`Archivo eliminado: ${absolutePath}`);
          }
        } catch (fsErr) {
          console.error(`Error al eliminar archivo ${absolutePath}:`, fsErr);
        }
      })
    );

    // Eliminar usuario (cascade eliminará relaciones)
    const deletedUser = await prisma.users.delete({
      where: { id: userId },
      include: { clients: true },
    });

    return deletedUser;
  } catch (error) {
    throw error;
  }
};

/**
 * Cambiar contraseña de un usuario
 */
export const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    // Obtener el usuario con su contraseña
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // Verificar que la contraseña actual es correcta
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordValid) {
      throw new Error("La contraseña actual es incorrecta");
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar la contraseña
    await prisma.users.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return true;
  } catch (error) {
    throw error;
  }
};
