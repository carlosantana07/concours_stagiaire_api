import { body, param } from "express-validator";

export class CategorieDto {
  static CreateCategorie() {
    return [
      body("libelle")
        .notEmpty()
        .withMessage("Le libelle est requis")
        .isString() 
        .withMessage("Le libelle doit etre en chaine de caractere"),
      body("description").optional(),
    ];
  }

  static UpdateCategorie() {
    return [
      body("id")
        .notEmpty()
        .withMessage("Id est requis")
        .isInt()
        .withMessage("le type ne correspond pas au type attendu"),
    ];
  }

  // au cas ou le frontend m'envoi la categorie par body  au lieu de params
  static DeleteCategorie() {
    return [
      param("id_categorie")
        .notEmpty()
        .withMessage("la reference de la categorie est requise")
        .isInt()
    ];
  }
}
