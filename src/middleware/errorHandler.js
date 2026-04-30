export const errorHandler = (err, req, res, next) => {
  console.error("Erreur serveur :", err);
  return res.status(500).json({ error: "Une erreur interne est survenue" });
};