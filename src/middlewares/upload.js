// backend/src/config/multerConfig.js (nuevo archivo)
import multer from "multer";
import path from "path";

// Configura el almacenamiento de Multer
const storage = multer.diskStorage({
  // Define la carpeta de destino para guardar los archivos
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  // Define el nombre del archivo
  filename: (req, file, cb) => {
    // Usa un nombre único (timestamp) para evitar conflictos
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// Crea el middleware de Multer
export const upload = multer({ storage: storage });
