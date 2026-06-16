import { error } from "console";

const resultat = {
  error: false,
  success: false,
  message: "",
  data: [],
};

const filterDeleted = (value, deleted=false) => {
  if (!Array.isArray(value)) {
    ((resultat.error = true),
      (resultat.message = "la valeur doit etre un tableau"));
  }
  if (value.length === 0) {
    ((resultat.error = true), (resultat.message = "L'object est vide"));
    return resultat;
  }
  // filtrer par non supprimer ou supprimer

  resultat.data = value.filter((f) => {
    if(deleted ===false) {
      return f.delete_at === null
    }
    else{
       return f.delete_at !== null
       
    }
  });

  resultat.success = true;
  resultat.message = "Donnees filtrer avec succes";

  return resultat;
};
export default filterDeleted;
