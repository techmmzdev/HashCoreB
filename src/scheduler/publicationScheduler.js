// backend/src/scheduler/publicationScheduler.js
import cron from "node-cron";
import { getPrisma } from "../config/db.js";

const prisma = getPrisma();
let isRunning = false; // Lock en memoria para evitar solapamientos

// 🚀 TAREA PRINCIPAL: Verificar y publicar publicaciones programadas
const checkAndPublish = async () => {
  if (isRunning) {
    console.log(
      "Scheduler: Ya hay una ejecución en curso, se omite este ciclo."
    );
    return;
  }
  isRunning = true;
  console.log(
    "Scheduler: Ejecutando verificación de publicaciones programadas..."
  );
  const now = new Date();
  try {
    // 1. **BÚSQUEDA DE PUBLICACIONES CANDIDATAS:**
    const publicationsToPublish = await prisma.publications.findMany({
      where: {
        status: {
          in: ["SCHEDULED"],
        },
        publish_date: {
          lte: now,
        },
        media: {
          some: {},
        },
      },
      select: {
        id: true,
      },
    });
    const publicationIds = publicationsToPublish.map((p) => p.id);
    if (publicationIds.length === 0) {
      console.log(
        "Scheduler: No hay publicaciones pendientes con media adjunta para publicar."
      );
      isRunning = false;
      return;
    }
    // 2. **ACTUALIZACIÓN MASIVA (si hay IDs):**
    const result = await prisma.publications.updateMany({
      where: {
        id: {
          in: publicationIds,
        },
      },
      data: {
        status: "PUBLISHED",
      },
    });
    console.log(
      `Scheduler: ${result.count} publicación(es) cambiaron a estado 'PUBLISHED' (con media verificada).`
    );
  } catch (error) {
    console.error(
      "Scheduler Error: Fallo al ejecutar la tarea de publicación automática.",
      error
    );
  }
  isRunning = false;
};

// ⏰ Función para iniciar el cron job con configuración por variable de entorno
export const startPublicationScheduler = () => {
  // Lee el cron desde env, por defecto cada 5 minuto
  const cronExpression = process.env.SCHEDULER_CRON || "*/5 * * * *";
  cron.schedule(cronExpression, checkAndPublish, {
    scheduled: true,
    timezone: "America/Lima", // Ajusta a tu zona horaria
  });
  console.log(
    `✅ Scheduler iniciado. Verificando publicaciones según cron (${cronExpression}).`
  );
};
