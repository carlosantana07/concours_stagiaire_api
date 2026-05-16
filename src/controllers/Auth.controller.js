import { prisma } from "../prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { contactTemplate } from "../services/templates/Mail/contactUs.js";
import { sendMailContact } from "../config/mailer.js";
import { connection } from "../config/redis.js";
import validateCnib from "../utils/verifyCnib.js";
import ValidatePhone from "../utils/verifyNumber.js";

// function ValidatePhone(value) {
//   if (!value) return { valid: false, message: "Numéro requis" };
//   const cleaned = value.replace(/\s+/g, "");
//   const match = cleaned.match(/^(\+?226)?(\d{8})$/);
//   if (!match) {
//     return {
//       valid: false,
//       message: "Numéro invalide. Ex : 70000000 ou +22670000000",
//     };
//   }
//   const local = match[2];
//   return { valid: true, formatted: `226${local}` };
// }
// function validateCnib(numero_cnib, date_delivrance) {
//   const expirationYears = 10;
//   const firstletter = "B";

//   const response = {
//     error: false,
//     success: false,
//     message: null,
//     year: null,
//   };

//   if (!numero_cnib) {
//     response.error = true;
//     response.message = "le numero de cnib ne doit pas etre vide";
//     return response;
//   }

//   if (!date_delivrance) {
//     response.error = true;
//     response.message = "la date de delivrance ne doit pas etre vide";
//     return response;
//   }

//   const deliveryDate = new Date(date_delivrance);

//   if (isNaN(deliveryDate)) {
//     response.error = true;
//     response.message = "date de delivrance invalide";
//     return response;
//   }

//   if (deliveryDate > new Date()) {
//     response.error = true;
//     response.message = "Votre carte d'identité nationale burkibe a un probleme";
//     return response;
//   }

//   const expirationDate = new Date(deliveryDate);
//   expirationDate.setFullYear(expirationDate.getFullYear() + expirationYears);

//   response.year = expirationDate;

//   if (expirationDate < new Date()) {
//     response.error = true;
//     response.message = "Votre carte d'identité nationale burkinabè a expiré";
//     return response;
//   }

//   if (typeof numero_cnib !== "string") {
//     response.error = true;
//     response.message = 'le numero de cnib doit etre en chaine de caractere"';
//     return response;
//   }

//   const first = numero_cnib.trim()[0];
//   if (!first) {
//     response.error = true;
//     response.message = 'le numero de cnib doit commencer par la lettre "B"';
//     return response;
//   }
//   if (first.toUpperCase() !== firstletter) {
//     response.error = true;
//     response.message = 'le numero de cnib doit commencer par la lettre "B"';
//     return response;
//   }

//   const regex = /^B\d{7,}$/;
//   if (!regex.test(numero_cnib)) {
//     response.error = true;
//     response.message = "le numero de cnib est incorrect. Veuillez ressaisir";
//     return response;
//   }

//   response.success = true;
//   response.message = "le cnib est valide, verification en cours";

//   return response;
// }

export class AuthController {
  constructor(notificationService) {
    this.notificationService = notificationService;

    this.Login = this.Login.bind(this);
    this.Register = this.Register.bind(this);
    this.VerifierOtp = this.VerifierOtp.bind(this);
    this.ForgotPassword = this.ForgotPassword.bind(this);
    this.ResetPassword = this.ResetPassword.bind(this);
    this.Logout = this.Logout.bind(this);
    this.ResendOtp = this.ResendOtp.bind(this);
    this.VerifieNumber = this.VerifieNumber.bind(this);
    this.ContactUS = this.ContactUS.bind(this);
    this.VerifieCnib = this.VerifieCnib.bind(this);
  }

  async VerifieCnib(req, res) {
    const { cnib, dateD } = req.body;
    const cni = cnib.trim();

    const response = validateCnib(cni, dateD);

    if (response.error) {
      return res.status(400).json(response);
    }

    const message = response.message;

    return res.status(200).json(response);
  }

  async VerifieNumber(req, res) {
    try {
      const { tel } = req.body;
      const { valid, formatted, message } = ValidatePhone(tel);
      if (!valid) return res.status(400).json({ error: message });

      const cachekey = `verif-${formatted}`;
      const otp = this.notificationService.genererOtp();
      const otp_expiration = new Date(Date.now() + 10 * 60 * 1000);

      const candidat = await prisma.candidat.findFirst({
        where: { telephone: formatted },
      });

      if (!candidat) {
        return res.status(404).json({ error: "Numéro non trouvé" });
      }

      await prisma.candidat.update({
        where: { id_candidat: candidat.id_candidat },
        data: { otp, otp_expiration },
      });

      await connection.set(cachekey, otp, "EX", 600);
      this.notificationService.telephone = formatted;
      await this.notificationService.envoyerOtpTelephone(otp);

      return res.status(200).json({ message: "OTP envoyé" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }

  async Login(req, res) {
    try {
      const { telephone, mot_de_passe } = req.body;

      const { valid, formatted, message } = ValidatePhone(telephone);
      if (!valid) return res.status(400).json({ error: message });

      if (!mot_de_passe) {
        return res.status(400).json({ error: "Mot de passe requis" });
      }

      const candidat = await prisma.candidat.findFirst({
        where: { telephone: formatted },
      });

      if (!candidat) {
        return res.status(401).json({ error: "Identifiants incorrects" });
      }

      const motDePasseCorrect = await bcrypt.compare(
        mot_de_passe,
        candidat.mot_de_passe,
      );

      if (!motDePasseCorrect) {
        return res.status(401).json({ error: "Identifiants incorrects" });
      }

      const token = jwt.sign(
        { id: candidat.id_candidat, email: candidat.email, role: "candidat" },
        process.env.JWT_SECRET,
        { expiresIn: "24h" },
      );

      return res.status(200).json({ message: "Connexion réussie", token });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }

  async Register(req, res) {
    try {
      const {
        nom,
        prenom,
        nom_jeune_fille,
        sexe,
        date_naissance,
        lieu_naissance,
        pays_naissance,
        numero_cnib,
        date_delivrance,
        telephone,
        email,
        mot_de_passe,
        matricule,
        emploi,
        ministere,
        choix,
      } = req.body;

      // Validation et formatage du téléphone
      const { valid, formatted, message } = ValidatePhone(telephone);
      if (!valid) return res.status(400).json({ error: message });

      // Vérifier les doublons
      const conditions = [{ numero_cnib }, { telephone: formatted }];
      if (email) conditions.push({ email });

      const existant = await prisma.candidat.findFirst({
        where: { OR: conditions },
      });

      // validation du cnib

      const cni = numero_cnib.trim();

      const response = validateCnib(cni, date_delivrance);

      if (response.error) {
        return res.status(400).json(response);
      }

      if (existant) {
        let msg = "Numéro CNIB déjà utilisé";
        if (existant.telephone === formatted) msg = "Téléphone déjà utilisé";
        if (email && existant.email === email) msg = "Email déjà utilisé";
        return res.status(409).json({ error: msg });
      }

      const motDePasseHashe = await bcrypt.hash(mot_de_passe, 10);
      const otp = this.notificationService.genererOtp();
      const otp_expiration = new Date(Date.now() + 10 * 60 * 1000);
      const choixFinal = !email ? "sms" : (choix ?? "sms");

      const candidat = await prisma.candidat.create({
        data: {
          nom,
          prenom,
          nom_jeune_fille: nom_jeune_fille ?? null,
          sexe,
          date_naissance: new Date(date_naissance),
          lieu_naissance,
          pays_naissance,
          numero_cnib,
          date_delivrance: date_delivrance ? new Date(date_delivrance) : null,
          telephone: formatted,
          email: email ?? null,
          mot_de_passe: motDePasseHashe,
          statut_compte: "INACTIF",
          type_candidat: matricule ? "PROFESSIONNEL" : "DIRECT",
          matricule: matricule ?? null,
          emploi: emploi ?? null,
          ministere: ministere ?? null,
          choix_notification: choixFinal,
          otp,
          otp_expiration,
        },
      });

      this.notificationService.email = candidat.email;
      this.notificationService.telephone = candidat.telephone;

      if (choixFinal === "sms") {
        await this.notificationService.envoyerOtpTelephone(otp);
      } else {
        await this.notificationService.envoyerOtpEmail(otp);
      }

      const token = jwt.sign(
        { id: candidat.id_candidat, email: candidat.email, role: "candidat" },
        process.env.JWT_SECRET,
        { expiresIn: "24h" },
      );

      return res.status(201).json({
        message:
          choixFinal === "sms"
            ? "Compte créé — OTP envoyé par SMS"
            : "Compte créé — OTP envoyé par email",
        candidat: { nom: candidat.nom, prenom: candidat.prenom, token },
      });
    } catch (err) {
      console.error(err);
      if (err.code === "P2002") {
        return res
          .status(409)
          .json({ error: "Email, téléphone ou CNIB déjà utilisé" });
      }
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }

  async VerifierOtp(req, res) {
    try {
      const { otp } = req.body;
      const { id_candidat } = req.user;

      const candidat = await prisma.candidat.findUnique({
        where: { id_candidat },
      });

      if (!candidat) {
        return res.status(404).json({ error: "Candidat introuvable" });
      }

      if (!candidat.otp_expiration || new Date() > candidat.otp_expiration) {
        return res.status(400).json({ error: "OTP expiré" });
      }

      // Convertir en string au cas où le client envoie un nombre
      const otpString = otp.toString();
      if (candidat.otp !== otpString) {
        return res.status(400).json({ error: "OTP incorrect" });
      }

      await prisma.candidat.update({
        where: { id_candidat },
        data: { statut_compte: "ACTIF", otp: null, otp_expiration: null },
      });

      return res.status(200).json({
        message: "Vérification réussie, vous pouvez vous connecter",
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }

  async ResendOtp(req, res) {
    try {
      const { email, telephone ,choix } = req.body;

      if (!email && !telephone) {
        return res.status(400).json({ error: "Email ou téléphone requis" });
      }

      const candidat = await prisma.candidat.findFirst({
        where: email ? { email } : { telephone },
      });

      if (!candidat) {
        return res.status(404).json({ error: "Candidat introuvable" });
      }

      const otp = this.notificationService.genererOtp();
      const otp_expiration = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.candidat.update({
        where: { id_candidat: candidat.id_candidat },
        data: { otp, otp_expiration },
      });

      this.notificationService.email = candidat.email;
      this.notificationService.telephone = candidat.telephone;

      if (choix === "sms") {
        await this.notificationService.envoyerOtpTelephone(otp);
      } else {
        await this.notificationService.envoyerOtpEmail(otp);
      }

      const token = jwt.sign(
        { id: candidat.id_candidat, email: candidat.email, role: "candidat" },
        process.env.JWT_SECRET,
        { expiresIn: "24h" },
      );

      return res.status(200).json({
        message:
          candidat.choix_notification === "sms"
            ? "OTP renvoyé par SMS"
            : "OTP renvoyé par email",
        token,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }

  async ForgotPassword(req, res) {
    try {
      const { email, telephone, choix } = req.body;

      let candidat;

      const { formatted, valid, message } = ValidatePhone(telephone);
      if (!valid) {
        return res.status().json(message);
      }
      if (formatted && choix === "sms") {
        candidat = await prisma.candidat.findFirst({
          where: { telephone: formatted },
        });
      } else {
        candidat = await prisma.candidat.findUnique({ where: { email } });
      }

      if (!candidat) {
        return res.status(404).json({
          error:
            choix === "sms"
              ? "Aucun compte associé à ce numéro"
              : "Aucun compte associé à cet email",
        });
      }

      const otp = this.notificationService.genererOtp();
      const otp_expire_at = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.candidat.update({
        where: { id_candidat: candidat.id_candidat },
        data: { otp, otp_expiration: otp_expire_at },
      });

      this.notificationService.email = candidat.email;
      this.notificationService.telephone = candidat.telephone;

      switch (choix) {
        case "sms":
          await this.notificationService.envoyerOtpTelephone(otp);
          break;
        case "mail":
        default:
          await this.notificationService.envoyerOtpEmail(otp);
          break;
      }

      const refreshToken = jwt.sign(
        {
          id: candidat.id_candidat,
          email: candidat.email,
        },
        process.env.JWT_SECRET,
        { expiresIn: "5h" },
      );

      res.json({
        message: "Code OTP envoyé pour réinitialisation du mot de passe",
        token: refreshToken,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }

  async ResetPassword(req, res) {
    const { mot_de_passe, otp } = req.body;
    const { id_candidat } = req.user;
    const candidat = await prisma.candidat.findUnique({
      where: { id_candidat },
    });

    // if (choix === "sms") {
    //   candidat = await prisma.candidat.findFirst({ where: { telephone } });
    // } else {
    //   candidat = await prisma.candidat.findUnique({ where: { email } });
    // }

    if (!candidat) {
      return res.status(404).json({
        error: "Aucun compte  trouve",
      });
    }

    if (candidat.otp !== otp)
      return res.status(400).json({ error: "code otp incorrect" });

    const mdphash = await bcrypt.hash(mot_de_passe, 10);

    const UpdateCandidat = await prisma.$transaction(async (tx) => {
      const updatedC = await tx.candidat.update({
        where: { id_candidat: candidat.id_candidat },
        data: {
          mot_de_passe: mdphash,
          otp: null,
          otp_expiration: null,
        },
      });
      return updatedC;
    });

    return res.status(200).json({
      message: `Bonjour ${UpdateCandidat.nom} {votre mots de passe a ete reinitialiser}`,
    });
  }
  async ContactUS(req, res) {
    try {
      const { email, message, nom } = req.body;
      const html = contactTemplate({ nom, email, message });
      await sendMailContact({
        to: process.env.MAIL_USER,
        subject: "Nouveau message de contact",
        html,
        email,
      });
      return res.status(200).json({ message: "Message envoyé avec succès" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }

  async Logout(req, res) {
    return res.status(200).json({ message: "Déconnexion réussie" });
  }
}
