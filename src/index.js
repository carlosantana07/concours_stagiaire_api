import dotenv from 'dotenv'
dotenv.config();

import '../src/middleware/routerPatch.js'
import express from "express";
import candidatRoutes from "./routes/candidat.route.js";
import authRoutes from "./routes/auth.route.js";
import adminRoutes from "./routes/admin.route.js";
import cors from "cors";
import { swaggerDocs } from "./swagger.js";
import helmet from "helmet";
import { connection } from "./config/redis.js";
import inscriptionRoutes from "./routes/inscription.route.js";
import paiementRoutes from "./routes/paiement.route.js";
import concoursRoutes from "./routes/concours.route.js";
import { limiter } from "./middleware/rateLimiter.js";

// import { ensureBucketExists } from "./config/minio.js";
import { UpdateStatusConcours } from './cron/Cron.js';
const app = express();
const PORT = process.env.PORT || 4000;

// await ensureBucketExists('e-concours');

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(limiter);

app.use("/api/inscription", inscriptionRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/candidat", candidatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paiementRoutes);
app.use("/api/concours", concoursRoutes);

// swaggerDocs(app, PORT);

app.get("/", (req, res) => {
  res.send("API e-concours opérationnelle");
});

// Middleware d'erreur global  ici les erreurs 500 sont renvonyer genre un try  global
app.use((err, req, res, next) => {
  console.error('Erreur serveur :', err.message);
  return res.status(500).json({ error: 'Une erreur interne est survenue' });
});

// ici je vais mettre les cron  pour les taches automatiques 

UpdateStatusConcours();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});