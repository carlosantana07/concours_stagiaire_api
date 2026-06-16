import { error } from "console";

const resultat = {
  success: false,
  message: "",
  error: false,
  data: [],
  isSup:false
};

const filterOne = (value) => {

  if(value.delete_at === null){
  resultat.success = true;
  resultat.message = "utilisateur supprime";
 resultat.isSup=false
  }
  else{
  resultat.success = false;
   resultat.isSup=true
  resultat.message = "utilisateur actif";
  }


  return resultat;
};
export default filterOne;
