const resultat = {
  error: false,
  success: false,
  message: "",
  data: [],
};

const filterOne = (value, deleted = false) => {
  if (deleted === false) {
    return value.delete_at === null;
  } else {
    return value.delete_at !== null;
  }

  resultat.success = true;
  resultat.message = "Donnees filtrer avec succes";

  return resultat;
};
export default filterOne;
