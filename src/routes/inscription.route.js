import express from "express";
import { InscriptionController } from "../controllers/inscription.controller.js";
import { AuthMiddleware } from "../middleware/AuthMiddleware.js";
import { can } from "../middleware/upload.middleware.js";
const router = express.Router();

router.use(AuthMiddleware.protect);
router.use(AuthMiddleware.CompteVerifier);
router.use(AuthMiddleware.CompteSupprimer);
router.post("/s-inscrire",  can.array("files", 5),InscriptionController.sInscrire);
router.get("/:id_inscription",InscriptionController.getInscription);
//router.post("/get-recepisser",InscriptionController.GetRecippiser);
// router.get('/mes-inscriptions',InscriptionController.MesInscriptions);

export default router;