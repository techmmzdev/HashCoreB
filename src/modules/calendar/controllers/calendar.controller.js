// backend/src/modules/calendar/controllers/calendar.controller.js
import * as calendarService from "../services/calendar.service.js";
import { handleControllerError } from "../../../shared/utils/errorHandler.js";

/**
 * Obtener todas las notas de calendario del usuario autenticado
 * Permite filtros opcionales: startDate, endDate, isEvent
 */
export const getMyCalendarNotes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, isEvent } = req.query;

    const filters = {
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(isEvent !== undefined && { isEvent: isEvent === "true" }),
    };

    const notes = await calendarService.getCalendarNotesByUser(userId, filters);

    res.status(200).json({
      notes,
      count: notes.length,
    });
  } catch (error) {
    handleControllerError(res, error, "Error al obtener notas de calendario");
  }
};

/**
 * Obtener TODAS las notas de calendario (SOLO ADMIN)
 * Permite filtros opcionales: userId, startDate, endDate, isEvent
 */
export const getAllCalendarNotes = async (req, res) => {
  try {
    const { userId, startDate, endDate, isEvent } = req.query;

    const filters = {
      ...(userId && { userId }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(isEvent !== undefined && { isEvent: isEvent === "true" }),
    };

    const notes = await calendarService.getAllCalendarNotes(filters);

    res.status(200).json({
      notes,
      count: notes.length,
    });
  } catch (error) {
    handleControllerError(
      res,
      error,
      "Error al obtener todas las notas de calendario"
    );
  }
};

/**
 * Obtener una nota de calendario específica por ID
 */
export const getCalendarNoteById = async (req, res) => {
  try {
    const noteId = parseInt(req.params.id);
    const userRole = req.user.role;
    const userId = userRole === "ADMIN" ? null : req.user.id;

    if (isNaN(noteId)) {
      return res.status(400).json({ message: "ID de nota inválido" });
    }

    const note = await calendarService.getCalendarNoteById(noteId, userId);

    res.status(200).json({ note });
  } catch (error) {
    if (error.message.includes("no encontrada")) {
      return res.status(404).json({ message: error.message });
    }
    handleControllerError(res, error, "Error al obtener nota de calendario");
  }
};

/**
 * Crear una nueva nota/evento de calendario
 */
export const createCalendarNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, note_date, is_event } = req.body;

    // Validaciones básicas
    if (!title || !note_date) {
      return res.status(400).json({
        message: "Título y fecha son requeridos",
      });
    }

    const noteData = {
      title,
      description,
      note_date,
      is_event,
    };

    const newNote = await calendarService.createCalendarNote(userId, noteData);

    res.status(201).json({
      note: newNote,
      message: "Nota de calendario creada exitosamente",
    });
  } catch (error) {
    if (error.message.includes("requerido")) {
      return res.status(400).json({ message: error.message });
    }
    handleControllerError(res, error, "Error al crear nota de calendario");
  }
};

/**
 * Actualizar una nota/evento de calendario existente
 */
export const updateCalendarNote = async (req, res) => {
  try {
    const noteId = parseInt(req.params.id);
    const userRole = req.user.role;
    const userId = userRole === "ADMIN" ? null : req.user.id;

    if (isNaN(noteId)) {
      return res.status(400).json({ message: "ID de nota inválido" });
    }

    const { title, description, note_date, is_event } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (note_date !== undefined) updateData.note_date = note_date;
    if (is_event !== undefined) updateData.is_event = is_event;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No se proporcionaron datos para actualizar",
      });
    }

    const updatedNote = await calendarService.updateCalendarNote(
      noteId,
      userId,
      updateData
    );

    res.status(200).json({
      note: updatedNote,
      message: "Nota de calendario actualizada exitosamente",
    });
  } catch (error) {
    if (error.message.includes("no encontrada")) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes("no puede estar vacío")) {
      return res.status(400).json({ message: error.message });
    }
    handleControllerError(res, error, "Error al actualizar nota de calendario");
  }
};

/**
 * Eliminar una nota/evento de calendario
 */
export const deleteCalendarNote = async (req, res) => {
  try {
    const noteId = parseInt(req.params.id);
    const userRole = req.user.role;
    const userId = userRole === "ADMIN" ? null : req.user.id;

    if (isNaN(noteId)) {
      return res.status(400).json({ message: "ID de nota inválido" });
    }

    const result = await calendarService.deleteCalendarNote(noteId, userId);

    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes("no encontrada")) {
      return res.status(404).json({ message: error.message });
    }
    handleControllerError(res, error, "Error al eliminar nota de calendario");
  }
};

/**
 * Obtener eventos próximos del usuario (útil para dashboard)
 */
export const getUpcomingEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const daysAhead = parseInt(req.query.days) || 7;

    if (daysAhead < 1 || daysAhead > 365) {
      return res.status(400).json({
        message: "El número de días debe estar entre 1 y 365",
      });
    }

    const events = await calendarService.getUpcomingEvents(userId, daysAhead);

    res.status(200).json({
      events,
      count: events.length,
      daysAhead,
    });
  } catch (error) {
    handleControllerError(res, error, "Error al obtener eventos próximos");
  }
};

/**
 * Obtener notas/eventos de un mes específico
 */
export const getCalendarNotesByMonth = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        message: "Año y mes son requeridos",
      });
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || isNaN(monthNum)) {
      return res.status(400).json({
        message: "Año y mes deben ser números válidos",
      });
    }

    const notes = await calendarService.getCalendarNotesByMonth(
      userId,
      yearNum,
      monthNum
    );

    res.status(200).json({
      notes,
      count: notes.length,
      year: yearNum,
      month: monthNum,
    });
  } catch (error) {
    if (error.message.includes("requeridos")) {
      return res.status(400).json({ message: error.message });
    }
    handleControllerError(res, error, "Error al obtener notas del mes");
  }
};
