// backend/src/shared/utils/errorHandler.js
import { Prisma } from "@prisma/client";

/**
 * Maneja errores específicos de Prisma y los traduce a mensajes más amigables
 */
export const handlePrismaError = (
  error,
  defaultMessage = "Error en la operación"
) => {
  // Error de violación de restricción única
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        throw new Error("El registro ya existe (email duplicado)");
      case "P2025":
        throw new Error("El registro no fue encontrado");
      case "P2003":
        throw new Error("Error de referencia en la base de datos");
      case "P2014":
        throw new Error("Los datos violan una restricción de la base de datos");
      default:
        throw new Error(`Error de base de datos: ${error.message}`);
    }
  }

  // Error de validación de Prisma
  if (error instanceof Prisma.PrismaClientValidationError) {
    throw new Error("Datos inválidos proporcionados");
  }

  // Error de inicialización de Prisma
  if (error instanceof Prisma.PrismaClientInitializationError) {
    throw new Error("Error de conexión a la base de datos");
  }

  // Si no es un error de Prisma, relanzar el error original
  throw error;
};

/**
 * Función auxiliar para manejar errores en controllers de forma consistente
 */
export const handleControllerError = (res, error, defaultMessage) => {
  console.error(error);

  try {
    handlePrismaError(error, defaultMessage);
  } catch (handledError) {
    // Errores 404 (no encontrado)
    if (
      handledError.message.includes("no fue encontrado") ||
      handledError.message.includes("no encontrado") ||
      handledError.message.includes("No encontrado")
    ) {
      return res.status(404).json({ message: handledError.message });
    }

    // Errores 409 (conflicto - duplicados)
    if (
      handledError.message.includes("ya existe") ||
      handledError.message.includes("registrado") ||
      handledError.message.includes("duplicado")
    ) {
      return res.status(409).json({ message: handledError.message });
    }

    // Errores 400 (validación)
    if (
      handledError.message.includes("inválido") ||
      handledError.message.includes("requerido") ||
      handledError.message.includes("no válido") ||
      handledError.message.includes("Datos inválidos")
    ) {
      return res.status(400).json({ message: handledError.message });
    }

    // Errores 403 (prohibido)
    if (
      handledError.message.includes("inactiva") ||
      handledError.message.includes("Contacta al administrador")
    ) {
      return res.status(403).json({ message: handledError.message });
    }

    // Error genérico 400
    return res.status(400).json({ message: handledError.message });
  }

  // Error 500 (interno del servidor)
  res.status(500).json({ message: `${defaultMessage}: Error inesperado.` });
};
