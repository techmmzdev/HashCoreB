/**
 * Script para generar sitemap.xml dinámicamente
 * Este archivo genera un sitemap basado en las rutas públicas de la aplicación
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const DOMAIN = process.env.FRONTEND_URL || "https://techmmz.shop";
const OUTPUT_PATH = path.join(
  __dirname,
  "../../../frontend/public/sitemap.xml"
);

// Define las rutas estáticas de tu aplicación
const staticRoutes = [
  {
    url: "/",
    changefreq: "daily",
    priority: "1.0",
  },
  {
    url: "/login",
    changefreq: "monthly",
    priority: "0.8",
  },
  // Agrega más rutas públicas aquí
  // {
  //   url: '/about',
  //   changefreq: 'monthly',
  //   priority: '0.7',
  // },
];

/**
 * Genera el contenido del sitemap XML
 */
function generateSitemapXML(routes) {
  const currentDate = new Date().toISOString().split("T")[0];

  const urlsXML = routes
    .map(
      (route) => `
  <url>
    <loc>${DOMAIN}${route.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urlsXML}
</urlset>`;
}

/**
 * Función principal para generar el sitemap
 */
async function generateSitemap() {
  try {
    console.log("🗺️  Generando sitemap.xml...");

    // Aquí puedes agregar lógica para obtener rutas dinámicas de la base de datos
    // Por ejemplo, publicaciones públicas, páginas de clientes públicos, etc.
    // const dynamicRoutes = await getDynamicRoutesFromDB();
    // const allRoutes = [...staticRoutes, ...dynamicRoutes];

    const allRoutes = staticRoutes;

    // Generar el contenido XML
    const sitemapContent = generateSitemapXML(allRoutes);

    // Crear el directorio si no existe
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Escribir el archivo
    fs.writeFileSync(OUTPUT_PATH, sitemapContent, "utf-8");

    console.log("✅ Sitemap generado exitosamente en:", OUTPUT_PATH);
    console.log(`📍 Total de URLs: ${allRoutes.length}`);
  } catch (error) {
    console.error("❌ Error al generar sitemap:", error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSitemap();
}

export default generateSitemap;
