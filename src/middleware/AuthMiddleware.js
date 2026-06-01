import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";
import filterOne from "../utils/filterOne.js";

export class AuthMiddleware {
  static async protect(req, res, next) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ error: "Token manquant" });

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        if (err.name === "TokenExpiredError") {
          return res
            .status(401)
            .json({ error: "Votre token a expiré, veuillez vous reconnecter" });
        }
        return res.status(401).json({ error: "Token invalide" });
      }

      const user = await prisma.candidat.findUnique({
        where: { id_candidat: decoded.id },
      });

      if (!user) {
        return res.status(401).json({ error: "Utilisateur introuvable" });
      }

      const result = filterOne(user);
      // console.log('result', result)
      if (result.success === true) {
        return res.status(401).json({
          error:
            "Votre compte subi une resctriction .\n veuillez contacter le service de maintenance \n pour plus de renseignement et traitement de votre demande ",
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }

  static async CompteVerifier(req, res, next) {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: "Veuillez vous authentifier" });
      }

      if (user.statut_compte !== "ACTIF") {
        return res.status(403).json({
          error: "Veuillez activer votre compte dans la partie profil",
        });
      }

      next();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }
}
