const AdminRessource = (values) => {
    return  values.map((value) => ({
      id: value.id_admin,
      nom: value.nom,
      prenom: value.prenom,
      email: value.email,
      telephone: value.telephone,
      role: value.role,
      statut: value.actif,
      date_creation: new Date(value.date_creation),
    
  }));
};
export default AdminRessource;
