import prisma from "../prisma.js";
import bcrypt from "bcrypt";

export const getAllCandidats = async () => {
  return prisma.candidat.findMany({
    select: {
      id_candidat: true,
      nom: true,
      prenom: true,
      sexe: true,
      email: true,
      telephone: true,
      type_candidat: true,
      statut_compte: true,
    },
  });
};

export const getCandidatById = async (id) => {
  const candidat = await prisma.candidat.findUnique({
    where: { id_candidat: id },
    select: {
      id_candidat: true,
      nom: true,
      prenom: true,
      nom_jeune_fille: true,
      sexe: true,
      date_naissance: true,
      lieu_naissance: true,
      pays_naissance: true,
      numero_cnib: true,
      date_delivrance: true,
      telephone: true,
      email: true,
      type_candidat: true,
      matricule: true,
      emploi: true,
      ministere: true,
      statut_compte: true,
      date_creation: true,
    },
  });

  if (!candidat) throw { status: 404, message: "Candidat non trouvé" };
  return candidat;
};

export const createCandidat = async (data) => {
  const {
    nom,
    prenom,
    nom_jeune_fille,
    sexe,
    date_naissance,
    lieu_naissance,
    pays_naissance,
    numero_cnib,
    date_delivrance,
    telephone,
    email,
    mot_de_passe,
    type_candidat,
    matricule,
    emploi,
    ministere,
  } = data;

  const emailExist = await prisma.candidat.findUnique({ where: { email } });
  if (emailExist) throw { status: 409, message: "Email déjà utilisé" };

  const cnibExist = await prisma.candidat.findUnique({
    where: { numero_cnib },
  });
  if (cnibExist) throw { status: 409, message: "Numéro CNIB déjà utilisé" };

  if (type_candidat === "PROFESSIONNEL" && !matricule) {
    throw {
      status: 400,
      message: "Le matricule est obligatoire pour un candidat professionnel",
    };
  }

  const motDePasseHashe = await bcrypt.hash(mot_de_passe, 10);

  return prisma.candidat.create({
    data: {
      nom,
      prenom,
      nom_jeune_fille,
      sexe,
      date_naissance: new Date(date_naissance),
      lieu_naissance,
      pays_naissance,
      numero_cnib,
      date_delivrance: date_delivrance ? new Date(date_delivrance) : null,
      telephone,
      email,
      mot_de_passe: motDePasseHashe,
      type_candidat: type_candidat || "DIRECT",
      matricule: type_candidat === "PROFESSIONNEL" ? matricule : null,
      emploi: type_candidat === "PROFESSIONNEL" ? emploi : null,
      ministere: type_candidat === "PROFESSIONNEL" ? ministere : null,
    },
    select: {
      id_candidat: true,
      nom: true,
      prenom: true,
      email: true,
      telephone: true,
      type_candidat: true,
    },
  });
};

export const updateCandidat = async (id, data) => {
  const {
    nom,
    prenom,
    nom_jeune_fille,
    sexe,
    date_naissance,
    lieu_naissance,
    pays_naissance,
    numero_cnib,
    date_delivrance,
    telephone,
    email,
    recepisse,
    statut_compte,
    matricule,
    emploi,
    ministere,
  } = data;

  // Vérifier que le candidat existe
  const exist = await prisma.candidat.findUnique({
    where: { id_candidat: id },
  });
  if (!exist) throw { status: 404, message: "Candidat non trouvé" };

  return prisma.candidat.update({
    where: { id_candidat: id },
    data: {
      ...(nom && { nom }),
      ...(prenom && { prenom }),
      ...(nom_jeune_fille && { nom_jeune_fille }),
      ...(sexe && { sexe }),
      ...(date_naissance && { date_naissance: new Date(date_naissance) }),
      ...(lieu_naissance && { lieu_naissance }),
      ...(pays_naissance && { pays_naissance }),
      ...(numero_cnib && { numero_cnib }),
      ...(date_delivrance && { date_delivrance: new Date(date_delivrance) }),
      ...(telephone && { telephone }),
      ...(email && { email }),
      ...(recepisse && { recepisse }),
      ...(statut_compte && { statut_compte }),
      ...(matricule && { matricule }),
      ...(emploi && { emploi }),
      ...(ministere && { ministere }),
    },
    select: {
      id_candidat: true,
      nom: true,
      prenom: true,
      email: true,
      telephone: true,
      type_candidat: true,
    },
  });
};

export const deleteCandidat = async (id) => {
  const exist = await prisma.candidat.findUnique({
    where: { id_candidat: id },
  });
  if (!exist) throw { status: 404, message: "Candidat non trouvé" };

  return prisma.candidat.delete({
    where: { id_candidat: id },
    select: { id_candidat: true, nom: true, prenom: true },
  });
};
