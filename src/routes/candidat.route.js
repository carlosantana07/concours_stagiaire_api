import { Router } from "express";
import { CandidatController } from "../controllers/Candidat.controller.js";
import { AuthMiddleware } from "../middleware/AuthMiddleware.js";
import { upload, can } from "../middleware/upload.middleware.js";

const router = Router();
// const ctrl   = new CandidatController();

router.use(AuthMiddleware.protect);
router.use(AuthMiddleware.CompteSupprimer);

router.get("/profil", CandidatController.getProfil);
router.put("/profil", CandidatController.updateProfil);
router.get("/mes-candidatures", CandidatController.getMesCandidatures);
router.get("/resultats", CandidatController.getResultats);
router.post("/recepisse", CandidatController.getRecepisse);
router.post(
  "/documents",
  can.array("files", 5),
  CandidatController.uploadDocumentsAzure,
);
router.delete(
  "/documents/delete/:blobName",
  CandidatController.deleteDocumentAzure,
);
router.put(
  "/documents/update/:blobName",
  CandidatController.updateDocumentAzure,
);
router.get("/mes-documents", CandidatController.mesDocuments);
export default router;
