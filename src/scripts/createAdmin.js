// scripts/createAdmin.js
import { getPrisma } from "../config/db.js";
import bcrypt from "bcrypt";

const prisma = getPrisma();

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash("Admin2025#", 10);

    const admin = await prisma.users.create({
      data: {
        email: "admin@app.com",
        password: hashedPassword,
        role: "ADMIN",
        name: "Administrador Master",
      },
    });

    console.log("✅ Admin creado exitosamente:", admin.email);
  } catch (error) {
    if (error.code === "P2002") {
      console.log("⚠️  El admin ya existe");
    } else {
      console.error("❌ Error:", error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
