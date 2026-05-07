import { Router } from "express";
import { CandidatController } from "../controllers/Candidat.controller.js";
import { AuthMiddleware } from "../middleware/AuthMiddleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = Router();
// const ctrl   = new CandidatController();

router.use(AuthMiddleware.protect); 


router.get("/profil",                CandidatController.getProfil);
router.put("/profil",                CandidatController.updateProfil);
router.get("/mes-candidatures",      CandidatController.getMesCandidatures);
router.get("/resultats",             CandidatController.getResultats);
router.post("/recepisse",            CandidatController.getRecepisse);
router.post("/documents",            CandidatController.uploadDocuments);
export default router;