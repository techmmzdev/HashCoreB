// backend/src/scheduler/publicationScheduler.js
import cron from "node-cron";
import { getPrisma } from "../config/db.js";

const prisma = getPrisma();

// 🚀 TAREA PRINCIPAL: Verificar y publicar publicaciones programadas
const checkAndPublish = async () => {
  console.log(
    "Scheduler: Ejecutando verificación de publicaciones programadas..."
  );
  const now = new Date();

  try {
    // 1. **BÚSQUEDA DE PUBLICACIONES CANDIDATAS:**
    const publicationsToPublish = await prisma.publications.findMany({
      where: {
        status: {
          // ✅ CORRECCIÓN 1: SOLAMENTE las publicaciones SCHEDULED deben pasar a PUBLISHED.
          // Las publicaciones DRAFT se publican manualmente o se programan primero.
          in: ["SCHEDULED"], // ⬅️ CORREGIDO
        },
        publish_date: {
          lte: now,
        },
        // ⭐️ VALIDACIÓN CLAVE: Debe existir AL MENOS UN archivo en la tabla 'media' relacionado.
        media: {
          some: {}, // Busca publicaciones donde la relación 'media' tiene AL MENOS UN registro
        },
      },
      select: {
        id: true, // Solo necesitamos los IDs para la actualización
      },
    });

    const publicationIds = publicationsToPublish.map((p) => p.id);

    if (publicationIds.length === 0) {
      console.log(
        "Scheduler: No hay publicaciones pendientes con media adjunta para publicar."
      );
      return;
    }

    // 2. **ACTUALIZACIÓN MASIVA (si hay IDs):**
    const result = await prisma.publications.updateMany({
      where: {
        id: {
          in: publicationIds, // Actualiza solo las IDs que cumplen la validación
        },
      },
      data: {
        // 🛑 CORRECCIÓN 2: Usar el ENUM correcto para el estado final: PUBLISHED
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
};

// ⏰ Función para iniciar el cron job (No requiere cambios)
export const startPublicationScheduler = () => {
  // Ejemplo: Se ejecuta cada 1 minutos
  const cronExpression = "*/1 * * * *";

  cron.schedule(cronExpression, checkAndPublish, {
    scheduled: true,
    timezone: "America/Lima", // Ajusta a tu zona horaria
  });

  console.log(
    `✅ Scheduler iniciado. Verificando publicaciones cada 1 minutos (${cronExpression}).`
  );
};
