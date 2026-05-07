import express from "express";
import { InscriptionController } from "../controllers/inscription.controller.js";
import { AuthMiddleware } from "../middleware/AuthMiddleware.js";

const router = express.Router();

router.use(AuthMiddleware.protect);
router.use(AuthMiddleware.CompteVerifier);

router.post("/s-inscrire",InscriptionController.sInscrire);
router.get("/:id_inscription",InscriptionController.getInscription);
//router.post("/get-recepisser",InscriptionController.GetRecippiser);
// router.get('/mes-inscriptions',InscriptionController.MesInscriptions);

export default router;