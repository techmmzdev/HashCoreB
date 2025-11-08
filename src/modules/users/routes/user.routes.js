// backend/src/modules/users/routes/user.routes.js
import express from "express";
import {
  createUser,
  createUserWithClient,
  getUsers,
  getUserById,
  updateUser,
  updateUserWithClient,
  deleteUser,
  getMyProfile,
  changeMyPassword,
} from "../controllers/user.controller.js";
import { authenticateJWT, requireAdmin } from "../../../middlewares/index.js";

const router = express.Router();

// =================== RUTAS PROTEGIDAS - ADMIN ===================
router.post("/", authenticateJWT, requireAdmin, createUser); // SOLO ADMIN
router.post(
  "/with-client",
  authenticateJWT,
  requireAdmin,
  createUserWithClient
); // SOLO ADMIN
router.get("/", authenticateJWT, requireAdmin, getUsers); // SOLO ADMIN
router.delete("/:id", authenticateJWT, requireAdmin, deleteUser); // SOLO ADMIN

// =================== RUTAS PROTEGIDAS - ADMIN O PROPIO USUARIO ===================
router.get("/me", authenticateJWT, getMyProfile); // Usuario actual
router.put("/me/password", authenticateJWT, changeMyPassword); // Cambiar contraseña
router.get("/:id", authenticateJWT, getUserById); // ADMIN o el propio
router.put("/:id", authenticateJWT, updateUser); // ADMIN o el propio (básico)
router.put("/:id/with-client", authenticateJWT, updateUserWithClient); // ADMIN o el propio (completo)

export default router;
