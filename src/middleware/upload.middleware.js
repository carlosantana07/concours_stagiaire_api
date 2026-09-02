import multer from "multer";

const storage = multer.memoryStorage();



const allowedMimeTypes = [
  // Excel
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  // CSV
  "text/csv",

  // // PDF
  // "application/pdf",

  // // Images
  // "image/png",
  // "image/avif",
];

const excelFileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  return cb(
    new Error(
      "Veuillez uploader un fichier Excel, CSV, PDF, PNG ou AVIF valide."
    ),
    false
  );
};

export const upload = multer({
  storage,
  fileFilter: excelFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 Mo
    files: 5,
  },
});



const allowedMimeTypesCan = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const candidatureFileFilter = (req, file, cb) => {
  if (allowedMimeTypesCan.includes(file.mimetype)) {
    return cb(null, true);
  }

  return cb(
    new Error(
      "Veuillez insérer un fichier de type PDF, JPG, JPEG ou PNG."
    ),
    false
  );
};

export const can = multer({
  storage,
  fileFilter: candidatureFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 Mo
    files: 5,
  },
});