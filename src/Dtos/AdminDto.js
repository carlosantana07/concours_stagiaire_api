import { body, param } from "express-validator";

export class AdminDto {
  static ValidateLogin() {
    return [
      body("email").notEmpty().withMessage('le email est requis').isString(),
      body("mot_de_passe").notEmpty().withMessage("mots de passe requis"),
    ];
  }

  static ValidateRegister(){
    return[
        body('nom').isString().notEmpty().withMessage('Le nom est requis'),
        body('prenom').isString().notEmpty().withMessage('Le nom est requis'),
        body('email').isEmail().withMessage('Le champ requiert une adresse mail valide').notEmpty().withMessage('L\'email est requis'),
        body('mot_de_passe').notEmpty().withMessage('Le mots de passe est requis').isLength({min:8}).withMessage('Le mot de passe dois contenir au moins 8 caracterere').isString(),
        body('telephone').notEmpty().withMessage('Le telephone est requis').isMobilePhone().isLength({min:8, max:8}).withMessage('le numero de telephone dois contenir 8 caractere'),
        body('role').optional().isIn([ 'SUPERADMIN','GESTIONNAIRE']).withMessage('le role que vous avez choisi n\'est pas pris en compte'),
        
    ];
  }

  static ValidateCreateCentre(){
    return[
      body('nom').isString().withMessage('le centre dois etre une chaine').notEmpty().withMessage('le nom du centre est requis')
    ];
  }

  static ValidateInscriptionUpdate (){
    return[
   
        body('id_inscription').isInt().notEmpty('la reference de l\'inscription ne doit pas etre nulle'),
        body('id_candidat').isUUID().notEmpty('la reference du candidat ne doit pas etre nul'),
        body('id_concours').isInt().notEmpty('la reference du concours ne doit pas etre nul'),
        body('id_centre').isInt().notEmpty('la reference du concours ne doit pas etre nul'),
      
    ]
  }

  static ValidateDeleteInscription(){
    return [
      param('id_inscription').isInt().notEmpty('la reference de l\'inscription ne doit pas etre nulle'),
    ]
  }

  
  static ValidateUpdateAdmin (){
    return [
      param('id_admin').notEmpty().withMessage('La reference de l\'admin est requise')
    ]
  }


}
