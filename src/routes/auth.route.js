import express from "express";
import { ValidateRequest } from "../middleware/ValidateRequest.js";
import { AuthMiddleware } from "../middleware/AuthMiddleware.js";
import { CandidatDto } from "../Dtos/CandidatDto.js";
import { authController } from "../container.js";
import { rateLi } from "../middleware/rateLimiter.js";


const router = express.Router();

//  Routes publiques
// Routes publiques
router.post(
  "/login",
  rateLi.authLimiter,
  CandidatDto.ValidateLogin(),
  ValidateRequest.handle,
  authController.Login,
);

router.post(
  "/register",
  rateLi.authLimiter,
  CandidatDto.validateRegister(),
  ValidateRequest.handle,
  authController.Register,
);

router.post(
  "/contact-us",
  CandidatDto.ValidateContactUs(),
  ValidateRequest.handle,
  authController.ContactUS,
);
router.post("/forgot-password", authController.ForgotPassword);
router.post("/resend-otp-code", authController.ResendOtp);

// routees de test pour la validiter du cnib ...
router.post("/verify-cnib", authController.VerifieCnib);

router.use(AuthMiddleware.protect);
router.use(AuthMiddleware.CompteSupprimer);

router.post("/verify", rateLi.otpLimiter, authController.VerifierOtp);
router.post("/reset-password", authController.ResetPassword);

export default router;
