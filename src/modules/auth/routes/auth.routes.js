// backend/src/modules/auth/routes/auth.routes.js
import express from "express";
import {
  loginUser,
  verifyToken,
  refreshToken,
  logout,
} from "../controllers/auth.controller.js";
import { authenticateJWT } from "../../../middlewares/index.js";

const router = express.Router();

// =================== RUTAS PÚBLICAS ===================
router.post("/login", loginUser);

// =================== RUTAS PROTEGIDAS ===================
router.get("/verify", authenticateJWT, verifyToken);
router.post("/refresh", refreshToken);
router.post("/logout", authenticateJWT, logout);

export default router;
