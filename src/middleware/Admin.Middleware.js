import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";
export class AdminMiddleware {


static async handle(req, res, next) {
  try {
    const Authheaders = req.headers.authorization;
    if (!Authheaders || !Authheaders.startsWith("Bearer"))
      return res.status(401).json({ error: "Token manquant." });

    const token = Authheaders.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError")
        return res.status(401).json({ error: "Token expiré." });
      return res.status(401).json({ error: "Token invalide." });
    }

    const admin = await prisma.admin.findUnique({
      where: { id_admin: decoded.id },
    });
    if (!admin) return res.status(404).json({ error: "Admin non trouvé." });
    if (!admin.actif) return res.status(403).json({ error: "Compte non actif." });

    req.admin = admin;
    next();
  } catch (err) {
    console.error("[AdminMiddleware]", err);
    return res.status(500).json({ error: "Une erreur interne est survenue." });
  }
}


  static async SuperAdmin(req, res, next) {

    try {
      if (req.admin?.role !== "SUPERADMIN") 
        return res
          .status(401)
          .json({ error: "Accès réservé aux super admins" });
      next();
    } catch (err) {
        
      return res.status(500).json({ error: "une erreur est survenue" });
    }
  }
}
