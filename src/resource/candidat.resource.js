class CandidatRessouce {


  async GetallCandidatResource(value) {
    return value.map((r) => ({
      id_candidat: r.id_candidat,
      nom: r.nom,
      prenom: r.prenom,
      type_candidat: r.type_candidat,
      delete_at: r.delete_at,
      numero_cnib: r.numero_cnib,
      telephone: r.telephone,
      email: r.email,
    }));
  }


async detailCandidatResource(r) {
  return {
    id_candidat: r.id_candidat,
    nom: r.nom,
    prenom: r.prenom,
    nom_jeune_fille: r.nom_jeune_fille,
    sexe: r.sexe,
    date_naissance: new Date(r.date_naissance),
    lieu_naissance: r.lieu_naissance,
    pays_naissance: r.pays_naissance,
    numero_cnib: r.numero_cnib,
    date_delivrance: new Date( r.date_delivrance),
    telephone: r.telephone,
    email: r.email,
    type_candidat: r.type_candidat,
    emploi: r.emploi,
    matricule: r.matricule,
    ministere: r.ministere,
    statut_compte: r.statut_compte,
    date_creation:new Date (r.date_creation),
    delete_at:  new Date(r.delete_at),
  };
}



}
; export default CandidatRessouce;