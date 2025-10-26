// backend/src/modules/calendar/services/calendar.service.js
import { getPrisma } from "../../../config/db.js";

const prisma = getPrisma();

/**
 * Obtener todas las notas/eventos de calendario de un usuario
 */
export const getCalendarNotesByUser = async (userId, filters = {}) => {
  try {
    const { startDate, endDate, isEvent } = filters;

    const where = {
      user_id: userId,
      ...(startDate &&
        endDate && {
          note_date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      ...(isEvent !== undefined && { is_event: isEvent }),
    };

    const notes = await prisma.calendarNote.findMany({
      where,
      orderBy: {
        note_date: "asc",
      },
    });

    return notes;
  } catch (error) {
    console.error("Error al obtener notas de calendario:", error);
    throw new Error("Error al obtener notas de calendario");
  }
};

/**
 * Obtener todas las notas/eventos de calendario (SOLO ADMIN)
 */
export const getAllCalendarNotes = async (filters = {}) => {
  try {
    const { startDate, endDate, isEvent, userId } = filters;

    const where = {
      ...(userId && { user_id: parseInt(userId) }),
      ...(startDate &&
        endDate && {
          note_date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      ...(isEvent !== undefined && { is_event: isEvent }),
    };

    const notes = await prisma.calendarNote.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        note_date: "asc",
      },
    });

    return notes;
  } catch (error) {
    console.error("Error al obtener todas las notas de calendario:", error);
    throw new Error("Error al obtener todas las notas de calendario");
  }
};

/**
 * Obtener una nota de calendario por ID
 */
export const getCalendarNoteById = async (noteId, userId = null) => {
  try {
    const where = {
      id: noteId,
      ...(userId && { user_id: userId }),
    };

    const note = await prisma.calendarNote.findFirst({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!note) {
      throw new Error("Nota de calendario no encontrada");
    }

    return note;
  } catch (error) {
    console.error("Error al obtener nota de calendario:", error);
    throw error;
  }
};

/**
 * Crear una nueva nota/evento de calendario
 */
export const createCalendarNote = async (userId, noteData) => {
  try {
    const { title, description, note_date, is_event } = noteData;

    // Validaciones
    if (!title || title.trim() === "") {
      throw new Error("El título es requerido");
    }

    if (!note_date) {
      throw new Error("La fecha es requerida");
    }

    const newNote = await prisma.calendarNote.create({
      data: {
        user_id: userId,
        title: title.trim(),
        description: description?.trim() || null,
        note_date: new Date(note_date),
        is_event: is_event ?? false,
      },
    });

    return newNote;
  } catch (error) {
    console.error("Error al crear nota de calendario:", error);
    throw error;
  }
};

/**
 * Actualizar una nota/evento de calendario
 */
export const updateCalendarNote = async (noteId, userId, updateData) => {
  try {
    // Verificar que la nota existe y pertenece al usuario (si no es admin)
    const existingNote = await prisma.calendarNote.findFirst({
      where: {
        id: noteId,
        ...(userId && { user_id: userId }),
      },
    });

    if (!existingNote) {
      throw new Error("Nota de calendario no encontrada o sin permisos");
    }

    // Preparar datos para actualizar
    const dataToUpdate = {};

    if (updateData.title !== undefined) {
      if (updateData.title.trim() === "") {
        throw new Error("El título no puede estar vacío");
      }
      dataToUpdate.title = updateData.title.trim();
    }

    if (updateData.description !== undefined) {
      dataToUpdate.description = updateData.description?.trim() || null;
    }

    if (updateData.note_date !== undefined) {
      dataToUpdate.note_date = new Date(updateData.note_date);
    }

    if (updateData.is_event !== undefined) {
      dataToUpdate.is_event = updateData.is_event;
    }

    const updatedNote = await prisma.calendarNote.update({
      where: { id: noteId },
      data: dataToUpdate,
    });

    return updatedNote;
  } catch (error) {
    console.error("Error al actualizar nota de calendario:", error);
    throw error;
  }
};

/**
 * Eliminar una nota/evento de calendario
 */
export const deleteCalendarNote = async (noteId, userId = null) => {
  try {
    // Verificar que la nota existe y pertenece al usuario (si no es admin)
    const existingNote = await prisma.calendarNote.findFirst({
      where: {
        id: noteId,
        ...(userId && { user_id: userId }),
      },
    });

    if (!existingNote) {
      throw new Error("Nota de calendario no encontrada o sin permisos");
    }

    await prisma.calendarNote.delete({
      where: { id: noteId },
    });

    return { message: "Nota eliminada exitosamente" };
  } catch (error) {
    console.error("Error al eliminar nota de calendario:", error);
    throw error;
  }
};

/**
 * Obtener eventos próximos de un usuario (para dashboard/notificaciones)
 */
export const getUpcomingEvents = async (userId, daysAhead = 7) => {
  try {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysAhead);

    const events = await prisma.calendarNote.findMany({
      where: {
        user_id: userId,
        is_event: true,
        note_date: {
          gte: now,
          lte: futureDate,
        },
      },
      orderBy: {
        note_date: "asc",
      },
      take: 10, // Limitar a 10 eventos
    });

    return events;
  } catch (error) {
    console.error("Error al obtener eventos próximos:", error);
    throw new Error("Error al obtener eventos próximos");
  }
};

/**
 * Obtener notas/eventos de un mes específico
 */
export const getCalendarNotesByMonth = async (userId, year, month) => {
  try {
    // Validar año y mes
    if (!year || !month || month < 1 || month > 12) {
      throw new Error("Año y mes válidos son requeridos");
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const notes = await prisma.calendarNote.findMany({
      where: {
        user_id: userId,
        note_date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        note_date: "asc",
      },
    });

    return notes;
  } catch (error) {
    console.error("Error al obtener notas del mes:", error);
    throw error;
  }
};
