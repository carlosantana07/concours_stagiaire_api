import { Router }          from "express";
import { ExamenController } from "../controllers/Examen.controller.js";
import { AuthMiddleware }   from "../middleware/AuthMiddleware.js";

const router = Router();

router.use(AuthMiddleware.protect);
router.use(AuthMiddleware.CompteVerifier);
router.use(AuthMiddleware.CompteSupprimer);

router.get("/concours/:id_concours",ExamenController.getExamensDuConcours);
router.get("/detail/:id_examen",ExamenController.getExamen);
router.get("/mes-resultats",ExamenController.getMesResultats);

export default router;