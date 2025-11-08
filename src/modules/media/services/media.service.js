// backend/src/modules/media/services/media.service.js
import { getPrisma } from "../../../config/db.js";
import { supabase } from "../../../config/supabase.js";
import { ENV } from "../../../config/env.js";
import { logger } from "../../../shared/utils/logger.js";
import fs from "fs";
import path from "path";

const prisma = getPrisma();

export const createMedia = async (publicationId, mediaData) => {
  try {
    // 1. Verificar que la publicación exista
    const publication = await prisma.publications.findUnique({
      where: { id: publicationId },
    });

    if (!publication) {
      throw new Error("La publicación especificada no existe.");
    }

    // 2. Validación defensiva: comprobar que el mime-type corresponda al content_type
    const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    const videoTypes = ["video/mp4", "video/webm"];

    const contentType = (publication.content_type || "").toUpperCase();
    const mime = (mediaData.media_type || "").toLowerCase();

    if (contentType === "REEL" && !videoTypes.includes(mime)) {
      throw new Error("Tipo de archivo inválido para REEL: se requiere video.");
    }

    if (contentType === "POST" && !imageTypes.includes(mime)) {
      throw new Error(
        "Tipo de archivo inválido para POST: se requiere imagen."
      );
    }

    // 3. Crear registro de media
    return await prisma.media.create({
      data: {
        publication_id: publicationId,
        media_type: mediaData.media_type,
        url: mediaData.url,
      },
    });
  } catch (error) {
    throw error;
  }
};

export const getMediaByPublicationId = async (publicationId) => {
  try {
    const media = await prisma.media.findMany({
      where: { publication_id: publicationId },
      orderBy: { created_at: "asc" },
    });
    // Eliminar archivo de Supabase si corresponde
    // Detecta si la URL es de Supabase (puedes ajustar el dominio si usas custom domain)
    if (media.url && media.url.includes("supabase.co")) {
      try {
        // Extraer el path relativo del archivo en el bucket
        // Ejemplo de URL: https://<project>.supabase.co/storage/v1/object/public/media/<filename>
        const match = media.url.match(/\/media\/(.+)$/);
        if (match && match[1]) {
          const filePath = match[1];
          const { data, error } = await supabase.storage
            .from("media")
            .remove([filePath]);
          if (error) {
            console.error("Error eliminando archivo de Supabase:", error);
          } else {
            console.info(`Archivo eliminado de Supabase: ${filePath}`);
          }
        } else {
          console.warn(
            "No se pudo extraer el path del archivo de la URL de Supabase:",
            media.url
          );
        }
      } catch (supErr) {
        console.error("Error al intentar eliminar en Supabase:", supErr);
      }
    }
    return media;
  } catch (error) {
    throw error;
  }
};

export const getMediaById = async (mediaId) => {
  try {
    return await prisma.media.findUnique({
      where: { id: mediaId },
      include: {
        publication: {
          select: {
            id: true,
            client_id: true,
            content_type: true,
            status: true,
          },
        },
      },
    });
  } catch (error) {
    throw error;
  }
};

export const deleteMedia = async (publicationId, mediaId) => {
  try {
    logger.media(`🔍 Iniciando eliminación de media`, {
      publicationId,
      mediaId,
      environment: ENV.node,
    });

    const media = await prisma.media.findFirst({
      where: {
        id: parseInt(mediaId),
        publication_id: parseInt(publicationId),
      },
      include: {
        publication: true,
      },
    });

    if (!media) {
      logger.media(`❌ Media no encontrado`, { publicationId, mediaId });
      return null;
    }

    logger.media(`📄 Media encontrado`, {
      id: media.id,
      url: media.url,
      mediaType: media.media_type,
    });

    // ====== ELIMINAR ARCHIVO FÍSICO ======
    const isDev = ENV.node === "development";

    logger.media(`🌍 Modo detectado: ${isDev ? "DESARROLLO" : "PRODUCCIÓN"}`, {
      NODE_ENV: ENV.node,
      isDev,
    });

    if (isDev) {
      // 💻 MODO DESARROLLO: Eliminar archivo local
      const uploadsDir = path.join(process.cwd(), "uploads");

      const fileName = media.url.startsWith("/uploads/")
        ? media.url.replace("/uploads/", "")
        : media.url.startsWith("uploads/")
        ? media.url.replace("uploads/", "")
        : media.url.replace(/^\//, ""); // Quitar / al inicio si existe

      const absolutePath = path.join(uploadsDir, fileName);

      try {
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
          logger.media(`✅ Archivo eliminado del disco: ${fileName}`, {
            path: absolutePath,
          });
        } else {
          logger.media(
            `⚠️ Archivo no encontrado en disco (omitiendo): ${fileName}`,
            {
              path: absolutePath,
            }
          );
        }
      } catch (fsErr) {
        logger.media(
          `❌ Error eliminando archivo del disco: ${fsErr.message}`,
          {
            path: absolutePath,
            error: fsErr,
          }
        );
      }
    } else {
      // ☁️ MODO PRODUCCIÓN: Eliminar de Supabase
      logger.media(`☁️ Intentando eliminar de Supabase`, {
        url: media.url,
        containsSupabase: media.url && media.url.includes("supabase.co"),
      });

      if (media.url && media.url.includes("supabase.co")) {
        try {
          const match = media.url.match(/\/media\/(.+)$/);
          logger.media(`🔍 Extrayendo nombre de archivo`, {
            url: media.url,
            match: match,
            filePath: match ? match[1] : null,
          });

          if (match && match[1]) {
            const filePath = match[1];
            logger.media(`🗑️ Eliminando archivo de Supabase: ${filePath}`);

            const { data, error } = await supabase.storage
              .from("media")
              .remove([filePath]);

            if (error) {
              logger.media(
                `❌ Error eliminando archivo de Supabase: ${error.message}`,
                {
                  filePath,
                  error: error,
                  errorCode: error.error,
                  errorMessage: error.message,
                }
              );
            } else {
              logger.media(`✅ Archivo eliminado de Supabase exitosamente`, {
                filePath,
                result: data,
              });
            }
          } else {
            logger.media(`⚠️ No se pudo extraer el path del archivo`, {
              url: media.url,
              regex: "/media/(.+)$",
            });
          }
        } catch (supErr) {
          logger.media(
            `💥 Excepción al eliminar de Supabase: ${supErr.message}`,
            {
              url: media.url,
              error: supErr,
              stack: supErr.stack,
            }
          );
        }
      } else {
        logger.media(
          `⚠️ URL no es de Supabase, omitiendo eliminación en storage`,
          {
            url: media.url,
          }
        );
      }
    }

    // Eliminar registro en DB
    logger.media(`🗄️ Eliminando registro de base de datos`);
    await prisma.media.delete({ where: { id: media.id } });
    logger.media(`✅ Registro eliminado de BD exitosamente`);

    // Contar media restantes para esta publicación
    const remaining = await prisma.media.count({
      where: { publication_id: media.publication_id },
    });

    logger.media(`📊 Media restante en publicación: ${remaining}`);

    let publicationUpdated = null;
    if (remaining === 0) {
      // Si no quedan archivos multimedia y la publicación está publicada o programada,
      // revertir a DRAFT
      if (
        media.publication &&
        ["PUBLISHED", "SCHEDULED"].includes(media.publication.status)
      ) {
        publicationUpdated = await prisma.publications.update({
          where: { id: media.publication_id },
          data: { status: "DRAFT" },
        });
        logger.media(`🔄 Publicación revertida a DRAFT`);
      }
    }

    logger.media(`🎉 Eliminación completada exitosamente`);

    return {
      deleted: true,
      media,
      publication: publicationUpdated,
      remainingMedia: remaining,
    };
  } catch (error) {
    logger.media(`💥 Error en deleteMedia: ${error.message}`, {
      error: error,
      stack: error.stack,
    });
    throw error;
  }
};

export const getMediaStats = async (publicationId) => {
  try {
    const [totalMedia, imageCount, videoCount] = await Promise.all([
      prisma.media.count({
        where: { publication_id: publicationId },
      }),
      prisma.media.count({
        where: {
          publication_id: publicationId,
          media_type: { startsWith: "image/" },
        },
      }),
      prisma.media.count({
        where: {
          publication_id: publicationId,
          media_type: { startsWith: "video/" },
        },
      }),
    ]);

    return {
      total: totalMedia,
      images: imageCount,
      videos: videoCount,
    };
  } catch (error) {
    throw error;
  }
};

export const uploadToSupabase = async (fileBuffer, fileName, mimeType) => {
  const isDev = ENV.node === "development";

  if (isDev) {
    // ====== 💻 MODO DESARROLLO ======
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const localPath = path.join(uploadsDir, fileName);
    await fs.promises.writeFile(localPath, fileBuffer);

    logger.media(`Archivo guardado localmente: ${fileName}`, {
      path: localPath,
    });

    // Devuelve la ruta relativa que tu frontend pueda resolver
    return `/uploads/${fileName}`;
  }

  // ====== ☁️ MODO PRODUCCIÓN ======
  const { data, error } = await supabase.storage
    .from("media")
    .upload(fileName, fileBuffer, { contentType: mimeType });

  if (error) throw error;
  if (!data?.path)
    throw new Error("No se pudo obtener la URL pública del archivo subido.");

  logger.media(`Archivo subido a Supabase: ${fileName}`, {
    path: data.path,
    contentType: mimeType,
  });

  const { data: publicData, error: publicError } = supabase.storage
    .from("media")
    .getPublicUrl(data.path);

  if (publicError) throw publicError;

  const publicUrl = publicData.publicUrl;
  logger.media(`URL pública generada`, { url: publicUrl });

  if (!publicUrl)
    throw new Error("No se pudo generar la URL pública del archivo subido.");

  return publicUrl;
};
