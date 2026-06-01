import { body, param } from "express-validator";

export class PaymentDto {
  static validatePayement() {
    return [
      body("id_inscription")
        .notEmpty()
        .withMessage("une inscriptions est requise pour effectuer un paiement")
        .isInt()
        .withMessage(
          "la donnee de l'inscription ne correspond pas au type attendu",
        ),

      body("id_concours")
        .notEmpty()
        .withMessage("un concours est requis pour effectuer un paiement")
        .isInt()
        .withMessage("la donnee du concours ne correspond pas au type attendu"),
    ];
  }
  static ValidateDetailPayment(){
    return [
      param('id_paiement').notEmpty().withMessage('La reference du paiement est requise')
    ];
  }
}
