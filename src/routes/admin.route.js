import express from "express";
import { AdminDto } from "../Dtos/AdminDto.js";
import { ValidateRequest } from "../middleware/ValidateRequest.js";
import { AdminController } from "../controllers/Admin.controller.js";
import { AdminMiddleware } from "../middleware/Admin.Middleware.js";
import { ConcoursDto } from "../Dtos/ConcoursDto.js";
import { CategorieDto } from "../Dtos/CategorieDto.js";
import { ExaenDto } from "../Dtos/ExamenDto.js";
import { upload } from "../middleware/upload.middleware.js";
import { CentreDto } from "../Dtos/CentreDto.js";
import { PaymentDto } from "../Dtos/PaymentDto.js";

const router = express.Router();

const validate = (dto) => [dto, ValidateRequest.handle];
router.post(
  "/upload-exam-question",
  upload.single("file"),
  AdminController.UploadsExamresponse,
);
router.post(
  "/login",
  ...validate(AdminDto.ValidateLogin()),
  AdminController.Login,
);

router.use(AdminMiddleware.handle);

router.get("/categories", AdminController.GetCategorie);
// router.get('/candidats/get-all/c',AdminController.GetAllCandidat)

router.get(
  "/concours/candidat-by-concours",
  AdminController.nbCandidatsByconcours,
);
router.get("/concours/circulaire", AdminController.CharCirculaire);

router.get("/admin/get-all-admin", AdminController.GetAllAdmin);
router.get("/admin/profile/:id_admin", AdminController.ProfileAdmin);

router.get("/dashboard", AdminController.Dashboard);

router.post(
  "/create-concours",
  ...validate(ConcoursDto.ValidateCreateConcours()),
  AdminController.CreateConcours,
);
router.get(
  "/concours/detail/:id_concours",
  ...validate(ConcoursDto.ValideDetailConcours()),
  AdminController.DetailConcours,
);
router.put(
  "/concours/:id_concours",
  ...validate(ConcoursDto.ValidateUpdateConcours()),
  AdminController.UpdateConcours,
);
router.delete(
  "/concours/:id_concours",
  ...validate(ConcoursDto.ValidateDeleteConcours()),
  AdminController.DeleteConcours,
);
router.get("/concours/search", AdminController.SearchConcours);
router.get("/concours", AdminController.GetAllConcours);
router.post(
  "/concours/:id_concours/switch-status",
  ...validate(ConcoursDto.ValideSwitchStatusConcours()),
  AdminController.SwitchStatuConcours,
);
router.patch("/concours/auto-switch-status", AdminController.AutoSwitch);
router.get(
  "/concours/concours-centre/:id_concours",
  AdminController.ConcoursCentre,
);

router.post(
  "/centres/create",
  ...validate(AdminDto.ValidateCreateCentre()),
  AdminController.CreateCentre,
);
router.put(
  "/centres/update-centre/:id_centre",
  ...validate(CentreDto.ValidateUpdateCentre()),
  AdminController.UpdateCentre,
);
router.delete(
  "centres/delete-centre/:id_centre",
  ...validate(CentreDto.ValidateDeleteCentre()),
  AdminController.DeleteCentre,
);
router.get("/centres/get-all-centre", AdminController.GetAllCentre);

router.get("/categories/concours", AdminController.GetCategorieConcours);
router.post(
  "/categories/create-categorie",
  ...validate(CategorieDto.CreateCategorie()),
  AdminController.CreateCategorie,
);
router.put(
  "/categories/update-categorie",
  ...validate(CategorieDto.UpdateCategorie()),
  AdminController.UpdateCategorieConcours,
);
router.delete(
  "/categories/delete-categorie/:id_categorie",
  ...validate(CategorieDto.DeleteCategorie()),
  AdminController.DeleteCategorie,
);
// router.put("/categories/update-categorie", ...validate(CategorieDto.UpdateCategorie()), AdminController.UpdateCategorieConcours);

router.get("/paiements", AdminController.ListesPaiements);
router.get(
  "/paiements/:id_candidat",
  ...validate(PaymentDto.ValidateDetailPayment()),
  AdminController.DetailPaiement,
);
router.put(
  "/paiements/:id_paiement/status",
  AdminController.UpdatePaiementStatus,
);
router.get("/paiement-by-candidat", AdminController.PaiementByCandidat);

router.get("/candidats/search", AdminController.SearchCandidat);
router.delete("/candidats/delete/:id_candidat", AdminController.DeleteCandidat);
router.post("/candidats/create", AdminController.RegisterCandidat);
router.get("/candidats/detail/:id_candidat", AdminController.DetailCandidat);
router.put(
  "/candidats/update-candidat/:id_candidat",
  AdminController.UpdateCandidat,
);
router.post("/candidats/inscrire-concours", AdminController.InscrireCandidаt);
router.get("/candidats/all", AdminController.GetAllCandidat);

router.get("/inscriptions/get-all", AdminController.GetAllInscription);
router.get(
  "/inscriptions/detail-inscription/:id_inscription",
  AdminController.DetailInscription,
);
router.put(
  "/inscriptions/update-status",
  AdminController.UpdateInscriptionStatus,
);
router.put(
  "/inscriptions/update-candidat-centre",
  AdminController.UpddateCandidatCentre,
);
router.delete(
  "/inscriptions/delete-candidat-inscription",
  AdminController.DeleteCandidatInscription,
);

router.get(
  "/inscriptions/concours-candidat/:id_concours",
  AdminController.AllCandidatConcours,
);

router.post(
  "/examens",
  ...validate(ExaenDto.ValidateCreateExam()),
  AdminController.CreateExamen,
);
router.get(
  "/examens/concours/:id_concours",
  AdminController.GetExamensByConcours,
);
router.get("/examens/:id_examen", AdminController.DetailExamen);
router.put("/examens/:id_examen", AdminController.UpdateExamen);
router.delete("/examens/:id_examen", AdminController.DeleteExamen);
router.get("/examen/list-exam", AdminController.getAllExam);

router.get("/sorti-resultat", AdminController.SortieResultat);
router.get("/concours/listes", AdminController.ListesConcours);

router.use(AdminMiddleware.SuperAdmin);
router.put("/admin/update-admin/:id_admin", AdminController.UpdateAdmin);
router.delete("/admin/delete-admin/:id_admin", AdminController.DeleteAdmin);
router.post(
  "/register",
  ...validate(AdminDto.ValidateRegister()),
  AdminController.Register,
);

router.get('/concours/resultat',AdminController.getResultat);
router.post('/concours/put-resultat',AdminController.PutResltat);

// a prevoir modifier le role ou assigner un nouveau role

export default router;
