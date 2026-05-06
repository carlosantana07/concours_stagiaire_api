const validateCnib = (numero_cnib, date_delivrance) =>{
  const expirationYears = 10;
  const firstletter = "B";

  const response = {
    error: false,
    success: false,
    message: null,
    year: null ,
  };

  if (!numero_cnib) {
    response.error = true;
    response.message = "le numero de cnib ne doit pas etre vide";
    return response;
  }

  if (!date_delivrance) {
    response.error = true;
    response.message = "la date de delivrance ne doit pas etre vide";
    return response;
  }

  const deliveryDate = new Date(date_delivrance);

  if (isNaN(deliveryDate)) {
    response.error = true;
    response.message = "date de delivrance invalide";
    return response;
  }

  if (deliveryDate > new Date()) {
    response.error = true;
    response.message = "Votre carte d'identité nationale burkibe a un probleme";
    return response;
  }

  const expirationDate = new Date(deliveryDate);
  expirationDate.setFullYear(expirationDate.getFullYear() + expirationYears);

  response.year = expirationDate;

  if (expirationDate < new Date()) {
    response.error = true;
    response.message = "Votre carte d'identité nationale burkinabè a expiré";
    return response;
  }

  if (typeof numero_cnib !== "string") {
    response.error = true;
    response.message = 'le numero de cnib doit etre en chaine de caractere"';
    return response;
  }

  const first = numero_cnib.trim()[0];
  if (!first) {
    response.error = true;
    response.message = 'le numero de cnib doit commencer par la lettre "B"';
    return response;
  }
  if (first.toUpperCase() !== firstletter) {
    response.error = true;
    response.message = 'le numero de cnib doit commencer par la lettre "B"';
    return response;
  }

  const regex = /^B\d{7,}$/;
  if (!regex.test(numero_cnib)) {
    response.error = true;
    response.message = "le numero de cnib est incorrect. Veuillez ressaisir";
    return response;
  }

  response.success = true;
  response.message = "le cnib est valide, verification en cours";

  return response;
};

export default validateCnib;