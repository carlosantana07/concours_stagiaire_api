import { body, param } from "express-validator";

export class ConcoursDto {
  static ValidateCreateConcours() {
    return [
      body("type")
        .notEmpty()
        .withMessage("Le type du concours ne doit pas être vide")
        .isString()
        .withMessage("Le type doit être une chaîne de caractères")
        .isIn(["DIRECT", "PROFESSIONNEL", "HANDICAPE"])
        .withMessage("Type invalide"),

      body("nom")
        .notEmpty()
        .withMessage("Nom du concours ne doit pas être vide")
        .isString()
        .withMessage("Le nom doit être une chaîne de caractères"),

      body("description")
        .notEmpty()
        .withMessage("Description ne doit pas être vide"),

      body("nombre_postes")
        .notEmpty()
        .withMessage("Le nombre de postes ne doit pas être vide")
        .isInt()
        .withMessage("Le nombre de postes doit être un entier"),

      body("annee")
        .notEmpty()
        .withMessage("L'année ne doit pas être vide")
        .isInt()
        .withMessage("L'année doit être un entier"),

      body("date_debut")
        .optional()
        .isISO8601()
        .withMessage("La date de début doit être une date valide"),

      body("date_fin")
        .optional()
        .isISO8601()
        .withMessage("La date de fin doit être une date valide"),
      body("categorieId")
        .notEmpty()
        .withMessage("La categorie du concours est riquise"),
      body("statut_concours")
        .optional()
        .isIn(["EN_ATTENTE", "OUVERT", "FERME"])
        .withMessage("Statut invalide"),
    ];
  }

  static ValidateUpdateConcours() {
    return [
      body("type")
        .isString()
        .withMessage("Le type de concours doit etre en chaine de caractere")
        .isIn(["DIRECT", "PROFESSIONNEL", "HANDICAPE"])
        .optional()
        .withMessage("le type du concours ne dois pas etre vide"),
      body("nom")
        .isString()
        .optional()
        .withMessage("Nom du concours ne dois pas etre vide"),

      body("description")
        .notEmpty()
        .withMessage("Descriptions ne dois pas etre vide"),
      body("nombre_postes")
        .isInt()
        .withMessage("le nombre de postes a promouvoir dois etre en entier")
        .optional()
        .withMessage("le nombre de postes ne dois pas etre vide"),

      body("annee")
        .isInt()
        .withMessage("annee dois etre en entier")
        .optional()
        .withMessage("annee  ne dois pas etre vide"),

      body("date_debut")
        .optional()
        .isISO8601()
        .withMessage("date debut doit etre une date"),

      body("date_fin")
        .optional()
        .isISO8601()
        .withMessage("date fin doit etre une date"),

      param("id_concours")
        .notEmpty()
        .withMessage("Les references du concours sont requises"),
      //Hugutte devrais typer le status_concours pour que je puisse utiliser sanns soucis
      body("statut_concours")
        .optional()
        .isIn(["EN_ATTENTE", "OUVERT", "FERME"]),
    ];
  }

  static ValideDetailConcours() {
    return [
      param("id_concours")
        .notEmpty()
        .withMessage("Les references du concours sont requises"),
    ];
  }
  static ValidateDeleteConcours() {
    return [
      param("id_concours")
        .notEmpty()
        .withMessage("Les references du concours sont requises"),
    ];
  }

  static ValideSwitchStatusConcours() {
    return [
      param("id_concours")
        .notEmpty()
        .withMessage("Les references du concours sont requises"),
      body("statut_concours")
        .notEmpty()
        .withMessage("Le status du concours est requis")
        .isIn(["OUVERT", "FERMER", "ATTENTE"]),
    ];
  }
}
