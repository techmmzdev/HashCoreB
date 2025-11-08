import { PrismaClient } from "@prisma/client";
import { ENV } from "./env.js";

let prisma;

// Obtener instancia de Prisma Client
export const getPrisma = () => {
  if (!prisma) {
    prisma = new PrismaClient({
      log:
        ENV.node === "development"
          ? ["query", "info", "warn", "error"]
          : ["warn", "error"],
    });
  }
  return prisma;
};

// Conectar a la base de datos al levantar el servidor
export const initDB = async () => {
  try {
    const client = getPrisma();
    await client.$connect();
    console.log("[DB] Conectado a la base de datos");
  } catch (error) {
    console.error("[DB] Error de conexión:", error);
    process.exit(1);
  }
};

// Cerrar la conexión de forma limpia
export const closeDB = async () => {
  if (prisma) {
    await prisma.$disconnect();
    console.log("[DB] Conexión cerrada");
  }
};

// Función para revisar el estado de la base de datos
export const dbHealthCheck = async () => {
  try {
    const client = getPrisma();
    await client.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};

// Cerrar conexión si el proceso recibe una señal de terminación
process.on("SIGINT", async () => {
  await closeDB();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeDB();
  process.exit(0);
});
