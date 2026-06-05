import express from "express";
import { AuthMiddleware } from "../middleware/AuthMiddleware.js";
import { PaiementController } from "../controllers/Paiement.controller.js";
import { PaymentDto } from "../Dtos/PaymentDto.js";
import { ValidateRequest } from "../middleware/ValidateRequest.js";

const router = express.Router();

router.post('/callback', PaiementController.Callback);


router.use(AuthMiddleware.protect);
router.use(AuthMiddleware.CompteVerifier);
router.use(AuthMiddleware.CompteSupprimer);

router.post('/init-payment', PaymentDto.validatePayement(), ValidateRequest.handle, PaiementController.Init);

export default router;