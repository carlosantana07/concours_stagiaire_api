import express from "express";
import { ValidateRequest } from '../middleware/ValidateRequest.js';
import { AuthMiddleware } from '../middleware/AuthMiddleware.js';
import { CandidatDto } from "../Dtos/CandidatDto.js";
import { authController } from "../container.js";


const router = express.Router();

//  Routes publiques (guest)
router.post('/login', CandidatDto.ValidateLogin(), ValidateRequest.handle, authController.Login);
router.post('/register', CandidatDto.validateRegister(), ValidateRequest.handle, authController.Register);
router.post('/contact-us',CandidatDto.ValidateContactUs(),ValidateRequest.handle,authController.ContactUS)
router.post('/forgot-password',authController.ForgotPassword);
router.post('/resend-otp-code',authController.ResendOtp);
router.use(AuthMiddleware.protect)
router.post('/verify', authController.VerifierOtp);
router.post('/reset-password',authController.ResetPassword);



export default router;