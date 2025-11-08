// backend/src/modules/calendar/routes/calendar.routes.js
import { Router } from "express";
import * as calendarController from "../controllers/calendar.controller.js";
import { authenticateJWT } from "../../../middlewares/auth/jwtAuth.js";
import { requireAdmin } from "../../../middlewares/auth/roleAuth.js";

const router = Router();

// =================== RUTAS PROTEGIDAS (Requieren autenticación) ===================

/**
 * @route   GET /api/calendar/my-notes
 * @desc    Obtener todas las notas/eventos del usuario autenticado
 * @access  Privado (ADMIN, CLIENTE)
 * @query   startDate, endDate, isEvent (opcionales)
 */
router.get("/my-notes", authenticateJWT, calendarController.getMyCalendarNotes);

/**
 * @route   GET /api/calendar/upcoming
 * @desc    Obtener eventos próximos del usuario (para dashboard/notificaciones)
 * @access  Privado (ADMIN, CLIENTE)
 * @query   days (opcional, default: 7)
 */
router.get("/upcoming", authenticateJWT, calendarController.getUpcomingEvents);

/**
 * @route   GET /api/calendar/month
 * @desc    Obtener notas/eventos de un mes específico
 * @access  Privado (ADMIN, CLIENTE)
 * @query   year, month (requeridos)
 */
router.get(
  "/month",
  authenticateJWT,
  calendarController.getCalendarNotesByMonth
);

/**
 * @route   GET /api/calendar/:id
 * @desc    Obtener una nota/evento específica por ID
 * @access  Privado (ADMIN puede ver todas, CLIENTE solo las propias)
 */
router.get("/:id", authenticateJWT, calendarController.getCalendarNoteById);

/**
 * @route   POST /api/calendar
 * @desc    Crear una nueva nota/evento de calendario
 * @access  Privado (ADMIN, CLIENTE)
 * @body    { title, description, note_date, is_event }
 */
router.post("/", authenticateJWT, calendarController.createCalendarNote);

/**
 * @route   PUT /api/calendar/:id
 * @desc    Actualizar una nota/evento existente
 * @access  Privado (ADMIN puede editar todas, CLIENTE solo las propias)
 * @body    { title, description, note_date, is_event } (todos opcionales)
 */
router.put("/:id", authenticateJWT, calendarController.updateCalendarNote);

/**
 * @route   DELETE /api/calendar/:id
 * @desc    Eliminar una nota/evento
 * @access  Privado (ADMIN puede eliminar todas, CLIENTE solo las propias)
 */
router.delete("/:id", authenticateJWT, calendarController.deleteCalendarNote);

// =================== RUTAS SOLO ADMIN ===================

/**
 * @route   GET /api/calendar/admin/all
 * @desc    Obtener TODAS las notas de calendario de todos los usuarios
 * @access  Privado (SOLO ADMIN)
 * @query   userId, startDate, endDate, isEvent (opcionales)
 */
router.get(
  "/admin/all",
  authenticateJWT,
  requireAdmin,
  calendarController.getAllCalendarNotes
);

export default router;
