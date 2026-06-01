const resultat = {
  error: false,
  success: false,
  message: "",
  data: [],
};

const filterOne = (value) => {

  if(value.delete_at === null){
  resultat.success = false;
  resultat.message = "utilisateur actif";
  }
  resultat.success = true;
  resultat.message = "utilisateur supprime";

  return resultat;
};
export default filterOne;
