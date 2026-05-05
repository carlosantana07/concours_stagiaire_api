import express from "express";
import { AdminDto } from "../Dtos/AdminDto.js";
import { ValidateRequest } from "../middleware/ValidateRequest.js";
import { AdminController } from "../controllers/Admin.controller.js";
import { AdminMiddleware } from "../middleware/Admin.Middleware.js";
import { ConcoursDto } from "../Dtos/ConcoursDto.js";
import { CategorieDto } from "../Dtos/CategorieDto.js";
import { ExaenDto } from "../Dtos/ExamenDto.js";

const router = express.Router();

const validate = (dto) => [dto, ValidateRequest.handle];

// ─── Routes ───────────────────────────────────────────
router.post("/login", ...validate(AdminDto.ValidateLogin()), AdminController.Login);
router.post("/register", ...validate(AdminDto.ValidateRegister()), AdminController.Register);

// ─── Middleware auth ─────────────
router.use(AdminMiddleware.handle);

// ─── Dashboard ──────────────────────────────────────────────────
router.get("/dashboard", AdminController.Dashboard);

// ─── Concours ───────────────────────────────────────────────────
router.post("/create-concours", AdminController.CreateConcours);
router.get("/concours/:id_concours", AdminController.DetailConcours);
router.put("/concours/:id_concours", AdminController.UpdateConcours);
router.delete("/concours/:id_concours", AdminController.DeleteConcours);
router.get("/concours/search", AdminController.SearchConcours);
router.get("/concours", AdminController.GetAllConcours);
router.post("/concours/:id_concours/switch-status", AdminController.SwitchStatuConcours);

// ─── Centres ────────────────────────────────────────────────────
router.post("/centres", ...validate(AdminDto.ValidateCreateCentre()), AdminController.CreateCentre);

// ─── Catégories de concours ─────────────────────────────────────
router.get("/categories", AdminController.GetCategorie);
router.get("/categories/concours", AdminController.GetCategorieConcours);
router.post("/categories", ...validate(CategorieDto.CreateCategorie()), AdminController.CreateCategorie);
router.put("/categories/:id_categorie", ...validate(CategorieDto.UpdateCategorie()), AdminController.UpdateCategorieConcours);
router.delete("/categories/:id_categorie", AdminController.DeleteCategorie);

// ─── Paiements ──────────────────────────────────────────────────
router.get("/paiements", AdminController.ListesPaiements);
router.get("/paiements/:id", AdminController.DetailPaiement);
router.put("/paiements/:id/status", AdminController.UpdatePaiementStatus);

// ─── Candidats ──────────────────────────────────────────────────
router.get("/candidats/search", AdminController.SearchCandidat);
router.get("/candidats",AdminController.GetAllCandidat);
router.get('/candidat/detail/:id_candidat',AdminController.DetailCandidat)
router.delete('/candidat/delete-candidat',AdminController.DeleteCandidat)

// ─── Examens ────────────────────────────────────────────────────
router.post("/examens", ...validate(ExaenDto.ValidateCreateExam()), AdminController.CreateExamen);
router.get("/examens/concours/:id_concours", AdminController.GetExamensByConcours);
router.get("/examens/:id_examen", AdminController.DetailExamen);
router.put("/examens/:id_examen", AdminController.UpdateExamen);
router.delete("/examens/:id_examen", AdminController.DeleteExamen);

export default router;