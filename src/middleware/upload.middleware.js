import multer from "multer";

const storage = multer.memoryStorage();

const allowedMimeTypes = [
  "application/vnd.ms-excel", 
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
  "text/csv"
];

const fileFilter = (req, file, cb) => {

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Veuillez uploader un fichier Excel valide"),
      false
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
});