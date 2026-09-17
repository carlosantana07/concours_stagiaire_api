import { prisma } from "../prisma.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {
  generateReceipt,
  GenererListCandidat,
  GenererListConcours,
} from "../services/Upload-file.service.js";
import connection from "../config/redis.js";
import { to } from "../utils/to.js";
import ValidatePhone from "../utils/verifyNumber.js";
import validateCnib from "../utils/verifyCnib.js";
import xlsx from "xlsx";
import path from "path";
import { response } from "express";
import fs from "fs";
import { type } from "os";
import { error } from "console";
import filterDeleted from "../utils/filter.js";
// import Redis from "ioredis";
import AdminRessource from "../resource/admin.resource.js";
import CandidatRessouce from "../resource/candidat.resource.js";
import filterOne from "../utils/filterOne.js";

async function invaliderCache(prefixe, nbPages = 10) {
  for (let page = 1; page <= nbPages; page++) {
    await redis.del(`${prefixe}:${page}:limit:10`);
  }
}

const redis = connection;
export class AdminController {
  #candidatRessource;
  constructor() {
    this.#candidatRessource = new CandidatRessouce();
  }
  static #statusInscriptions = ["EN_ATTENTE", "VALIDEE", "ANNULEE"];

  static #statusPaiement = ["REUSSI", "ECHOUE", "ATTENTE"];

  async  delByPattern(pattern) {
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
}



  static async Register(req, res) {
    const { email, mot_de_passe, nom, prenom, telephone, role } = req.body;

    if (await prisma.admin.findUnique({ where: { email } })) {
      return res
        .status(409)
        .json({ error: "Vous avez déjà un compte, veuillez vous connecter" });
    }

    const cachekey = "admin";

    const passwordHash = await bcrypt.hash(mot_de_passe, 10);

    const admin = await prisma.admin.create({
      data: {
        email,
        mot_de_passe: passwordHash,
        nom,
        prenom,
        telephone,
        role,
        date_creation: new Date(),
        updated_at: new Date(),
      },
    });
  const cacheKey = `inscription:*`
    await delByPattern(cachekey);
    return res.status(201).json({
      message: "Votre compte a été créé avec succès",
      id: admin.id_admin,
    });
  }

  static async Login(req, res) {
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {
      return res
        .status(400)
        .json({ error: "Les champs ne sont pas correctement remplis" });
    }

    const admin = await prisma.admin.findUnique({ where: { email } });

    if (!admin) {
      return res.status(404).json({ error: "Aucun admin trouvé" });
    }

    if (admin.actif === false) {
      return res.status(401).json({ error: "Votre compte n'a pas été activé" });
    }

    const motDePasseCorrect = await bcrypt.compare(
      mot_de_passe,
      admin.mot_de_passe,
    );

    if (!motDePasseCorrect) {
      return res
        .status(401)
        .json({ error: "Les informations de connexion sont erronées" });
    }

    const token = jwt.sign(
      { id: admin.id_admin, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    return res.status(200).json({ token, message: "Connexion réussie" });
  }

  static async Logout(req, res) {
    return res.status(200).json({ message: "Déconnexion réussie" });
  }

  static async Dashboard(req, res) {
    const [
      nbConcours,
      nbConcoursOuverts,
      nbDepot,
      nbDepotEnAttente,
      nbDepotValides,
      nbDepotRejetes,
      nbCandidats,
      nbCandidatsDirect,
      nbCandidatsProfessionnel,
      nbPaiements,
      nbPaiementsConfirmes,
      nbPaiementsEnAttente,
      montantTotal,
      nbAdmis,
      concoursRecents,
      inscriptionsRecentes,
      paiementsRecents,
      concoursParType,
      inscriptionsParJour,
      inscription,
    ] = await Promise.all([
      prisma.concours.count(),
      prisma.concours.count({ where: { statut_concours: "ouvert" } }),
      prisma.inscription.count(),
      prisma.inscription.count({ where: { statut_inscription: "EN_ATTENTE" } }),
      prisma.inscription.count({ where: { statut_inscription: "VALIDEE" } }),
      prisma.inscription.count({ where: { statut_inscription: "ANNULEE" } }),
      prisma.candidat.count({ where: { delete_at: null } }),
      prisma.candidat.count({
        where: { type_candidat: "DIRECT", delete_at: null },
      }),
      prisma.candidat.count({
        where: { type_candidat: "PROFESSIONNEL", delete_at: null },
      }),
      prisma.paiement.count(),
      prisma.paiement.count({ where: { statut_paiement: "REUSSI" } }),
      prisma.paiement.count({ where: { statut_paiement: "ATTENTE" } }),
      prisma.paiement.aggregate({
        _sum: { montant: true },
        where: { statut_paiement: "REUSSI" },
      }),
      prisma.resultat.count({ where: { statut: "admis" } }),
      prisma.concours.findMany({
        take: 5,
        orderBy: { date_debut: "desc" },
        select: {
          id_concours: true,
          nom: true,
          type: true,
          statut_concours: true,
          date_debut: true,
          date_fin: true,
          nombre_postes: true,
          _count: { select: { inscription: true } },
        },
      }),
      prisma.inscription.findMany({
        take: 10,
        orderBy: { date_inscription: "desc" },
        select: {
          id_inscription: true,
          date_inscription: true,
          statut_inscription: true,
          candidat: {
            select: {
              nom: true,
              prenom: true,
              email: true,
              type_candidat: true,
            },
          },
          concours: { select: { nom: true, type: true } },
          paiement: {
            select: {
              statut_paiement: true,
              montant: true,
              mode_paiement: true,
            },
          },
        },
      }),
      prisma.paiement.findMany({
        take: 5,
        orderBy: { date_paiement: "desc" },
        select: {
          id_paiement: true,
          montant: true,
          mode_paiement: true,
          statut_paiement: true,
          date_paiement: true,
          reference_transaction: true,
          inscription: {
            select: {
              candidat: { select: { nom: true, prenom: true } },
              concours: { select: { nom: true } },
            },
          },
        },
      }),
      prisma.concours.groupBy({ by: ["type"], _count: { _all: true } }),
      prisma.inscription.groupBy({
        by: ["date_inscription"],
        _count: { _all: true },
        orderBy: { date_inscription: "asc" },
        where: {
          date_inscription: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30)),
          },
        },
      }),
      prisma.inscription.findMany({}),
    ]);
    // incription par concours ....
    // on prend chauqe concours puis verifier le nombre dans les inscriptions
    const IPC = {};
    // chaque trois jours
    //
    // const aujourdui = new Date();
    // aujourdui.setHours(0 ,0 ,0 ,0);

    // const hier = new Date(aujourdui);
    // hier.setDate(hier.getDate()-1)

    // //
    // console.log(aujourdui.getDate())
    // console.log(hier)
    ///
    // const data =  {
    //   succ = inscription.filter((f)=>{
    //   return[
    //      pass= new Date(f.date_inscription).setHours(0,0,0,0) ===  hier
    //   ]
    //   })
    // }

    return res.status(200).json({
      success: true,
      data: {
        concours: {
          total: nbConcours,
          ouverts: nbConcoursOuverts,
          fermes: nbConcours - nbConcoursOuverts,
          parType: concoursParType,
          recents: concoursRecents,
        },
        inscriptions: {
          total: nbDepot,
          en_attente: nbDepotEnAttente,
          valides: nbDepotValides,
          rejetes: nbDepotRejetes,
          taux_validation:
            nbDepot > 0
              ? ((nbDepotValides / nbDepot) * 100).toFixed(1) + "%"
              : "0%",
          parJour: inscriptionsParJour,
          recentes: inscriptionsRecentes,
        },
        candidats: {
          total: nbCandidats,
          direct: nbCandidatsDirect,
          professionnel: nbCandidatsProfessionnel,
        },
        paiements: {
          total: nbPaiements,
          confirmes: nbPaiementsConfirmes,
          en_attente: nbPaiementsEnAttente,
          montant_total: montantTotal._sum.montant ?? 0,
          recents: paiementsRecents,
        },
        resultats: { total_admis: nbAdmis },
      },
    });
  }

  static async CreateCentre(req, res) {
    const { nom } = req.body;

    const centresExistants = await prisma.centre.findMany({
      where: { nom: { contains: nom, mode: "insensitive" } },
    });

    if (centresExistants.length > 0) {
      return res
        .status(409)
        .json({ error: "Un centre avec ce nom existe déjà" });
    }

    const nouveauCentre = await prisma.centre.create({ data: { nom } });

    return res.status(201).json(nouveauCentre);
  }

  static async UpdateCentre(req, res) {
    const { id_centre } = req.params;
    const { nom } = req.body;

    let id_c = id_centre;

    if (!id_centre) {
      return res
        .status(400)
        .json({ error: "Les references  du centre sont incorrect" });
    }
    // if (!nom) {
    //   return res
    //     .status(400)
    //     .json({ error: "tous les champs doivent etre remplis" });
    // }

    if (typeof id_centre === "string") {
      id_c = parseInt(id_centre);
    }
    const centre = await prisma.centre.findFirst({
      where: {
        id_centre: id_c,
      },
    });

    if (!centre) {
      return res.status(404).json({ error: "Aucun centre trouvee" });
    }

    await prisma.$transaction(async (tx) => {
      const maj = await tx.centre.update({
        where: {
          id_centre: centre.id_centre,
        },
        data: {
          nom: nom ?? centre.nom,
        },
      });
      return maj;
    });

    return res.status(200).json({ message: "Le centre a ete mise a jour" });
  }

  static async DeleteCentre(req, res) {
    const { id_centre } = req.params;
    if (!id_centre) {
      return res
        .status(400)
        .json({ error: "Les references  du centre sont incorrect" });
    }
    let id_c = id_centre;
    if (typeof id_centre === "string") {
      id_c = parseInt(id_centre);
    }
    await prisma.$transaction(async (tx) => {
      await tx.centre.delete({
        where: {
          id_centre: id_c,
        },
      });
    });

    return res
      .status(200)
      .json({ message: "Le centre a ete supprimer avec success" });
  }

  static async CreateConcours(req, res) {
    const {
      nom,
      type,
      description,
      nombre_postes,
      annee,
      date_debut,
      date_fin,
      statut_concours,
      categorieId,
      centres,
    } = req.body;

    const id_admin = req.admin.id_admin;

    if (!id_admin || req.admin.actif === false) {
      return res
        .status(401)
        .json({ error: "Vous n'êtes pas autorisé à effectuer cette action" });
    }

    const exists = await prisma.concours.findFirst({
      where: { nom: { equals: nom, mode: "insensitive" } },
    });

    if (exists) {
      return res.status(409).json({ error: "Ce concours existe déjà" });
    }

    const concoursCreate = await prisma.$transaction(async (tx) => {
      return await tx.concours.create({
        data: {
          nom,
          type,
          description,
          frais_inscription: 800,
          nombre_postes,
          annee,
          date_debut: new Date(date_debut),
          date_fin: new Date(date_fin),
          statut_concours,
          id_admin,
          categorieId,
          centres: {
            create: centres.map((id_centre) => ({
              centre: { connect: { id_centre } },
            })),
          },
        },
      });
    });

    return res.status(201).json({
      message: `Concours ${concoursCreate.nom} créé avec succès`,
      data: concoursCreate,
    });
  }

  static async GetAllConcours(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const cacheKey = `concours`;
    const concoursCached = await redis.get(cacheKey);
    if (concoursCached) {
      return res.status(200).json(JSON.parse(concoursCached));
    }

    const [concours, total] = await Promise.all([
      prisma.concours.findMany({
        skip,
        take: limit,
        orderBy: { date_debut: "desc" },
        select: {
          id_concours: true,
          nom: true,
          type: true,
          statut_concours: true,
          date_debut: true,
          date_fin: true,
          nombre_postes: true,
          description: true,
          annee: true,
          frais_inscription: true,
          _count: { select: { inscription: true } },
          categorie: { select: { id: true, libelle: true, description: true } },
        },
      }),
      prisma.concours.count(),
    ]);

    const response = {
      page:page,
      limit:limit,
      total:total,
      totalPages: Math.ceil(total / limit),
      data: concours,
    };

    await redis.set(cacheKey, JSON.stringify(response), "EX", 300);
    return res.status(200).json(response);
  }

  static async DetailConcours(req, res) {
    const id_concours = parseInt(req.params.id_concours);

    if (isNaN(id_concours)) {
      return res.status(400).json({ error: "ID de concours invalide" });
    }

    const concours = await prisma.concours.findUnique({
      where: { id_concours },
      select: {
        id_concours: true,
        nom: true,
        type: true,
        description: true,
        frais_inscription: true,
        nombre_postes: true,
        annee: true,
        date_debut: true,
        date_fin: true,
        statut_concours: true,
        examen: {
          select: { type_examen: true, date_examen: true, lieu: true },
        },
        _count: { select: { inscription: true } },
        centres: {
          select: { centre: { select: { nom: true, id_centre: true } } },
        },
        categorie: { select: { id: true, libelle: true, description: true } },
      },
    });

    if (!concours) {
      return res.status(404).json({ error: "Aucun concours trouvé" });
    }

    return res.status(200).json({ data: concours });
  }

  static async UpdateConcours(req, res) {
    const id_concours = parseInt(req.params.id_concours);

    if (isNaN(id_concours)) {
      return res.status(400).json({ error: "ID de concours invalide" });
    }

    const {
      nom,
      type,
      description,
      frais_inscription,
      nombre_postes,
      annee,
      date_debut,
      date_fin,
      statut_concours,
    } = req.body;

    const concours = await prisma.concours.findUnique({
      where: { id_concours },
    });

    if (!concours) {
      return res.status(404).json({ error: "Concours non trouvé" });
    }

    const updated = await prisma.concours.update({
      where: { id_concours },
      data: {
        nom: nom ?? concours.nom,
        type: type ?? concours.type,
        description: description ?? concours.description,
        frais_inscription: frais_inscription ?? concours.frais_inscription,
        nombre_postes: nombre_postes ?? concours.nombre_postes,
        annee: annee ?? concours.annee,
        date_debut: date_debut ? new Date(date_debut) : concours.date_debut,
        date_fin: date_fin ? new Date(date_fin) : concours.date_fin,
        statut_concours: statut_concours ?? concours.statut_concours,
      },
    });
    const cachekey = `concours`
    await delByPattern(cachekey);

  

    return res.status(200).json({
      message: "Les informations du concours ont été mises à jour",
      data: updated,
    });
  }

  static async DeleteConcours(req, res) {
    const id_concours = parseInt(req.params.id_concours);

    if (isNaN(id_concours)) {
      return res.status(400).json({ error: "id_concours invalide" });
    }

    const concours = await prisma.concours.findUnique({
      where: { id_concours },
    });

    if (!concours) {
      return res.status(404).json({ error: "Concours introuvable" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.ConcoursCentre.deleteMany({
        where: { concoursId: id_concours },
      });
      await tx.concours.delete({ where: { id_concours } });
    });

        const cachekey = `concours`
    await delByPattern(cachekey);

    return res.status(200).json({ message: "Concours supprimé avec succès" });
  }

  static async SwitchStatuConcours(req, res) {
    const { statut_concours } = req.body;
    const id_concours = parseInt(req.params.id_concours);

    if (isNaN(id_concours)) {
      return res.status(400).json({ error: "ID de concours incorrect" });
    }

    const concours = await prisma.concours.findUnique({
      where: { id_concours },
    });

    if (!concours) {
      return res.status(404).json({ error: "Concours non trouvé" });
    }

    await prisma.concours.update({
      where: { id_concours },
      data: { statut_concours },
    });

    return res.status(200).json({ message: "Statut changé avec succès" });
  }

  static async AutoSwitch(req, res) {
    const id = Number(req.body.id_concours);

    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID invalide" });
    }

    const status = ["OUVERT", "FERMER", "ATTENTE"];
    //                 0          1       2

    console.log("id du concours :", id);
    const concours = await prisma.concours.findFirst({
      where: {
        id_concours: id,
      },
    });

    if (!concours) {
      return res.status(404).json({ error: "Aucun concours trouve" });
    }

    let statusConcours = concours.statut_concours;

    const isIncludes = status.includes(statusConcours);
    console.log(isIncludes);
    if (!isIncludes) {
      return res.status(400).json({
        error:
          "Le status du concours est errone, veuillez modifier manuellement",
      });
    }

    const index = status.indexOf(statusConcours);

    console.log(index);

    switch (index) {
      case 0:
        statusConcours = status[1];
        break;
      case 1:
        statusConcours = status[2];
        break;
      case 2:
        statusConcours = status[0];
        break;
    }

    await prisma.$transaction(async (tx) => {
      await tx.concours.update({
        where: {
          id_concours: concours.id_concours,
        },
        data: {
          statut_concours: statusConcours,
        },
      });
    });

    return res.status(200).json({
      message: `Status mis a jour avec success ::index : ${index}  :: status ${statusConcours}`,
    });
  }

  static async SearchConcours(req, res) {
    const { type, nom, annee, date_debut, date_fin } = req.query;

    const concours = await prisma.concours.findMany({
      where: {
        ...(nom && { nom: { contains: nom, mode: "insensitive" } }),
        ...(type && { type }),
        ...(annee && { annee: parseInt(annee) }),
        ...(date_debut && { date_debut: { gte: new Date(date_debut) } }),
        ...(date_fin && { date_fin: { lte: new Date(date_fin) } }),
      },
      orderBy: { date_debut: "desc" },
      select: {
        id_concours: true,
        nom: true,
        type: true,
        statut_concours: true,
        date_debut: true,
        date_fin: true,
        nombre_postes: true,
        _count: { select: { inscription: true } },
      },
    });

    if (concours.length === 0) {
      return res.status(404).json({ error: "Aucun concours trouvé" });
    }

    return res.status(200).json({ data: concours });
  }

  static async SearchCandidat(req, res) {
    const {
      nom,
      prenom,
      sexe,
      pays_naissance,
      email,
      statut_compte,
      matricule,
    } = req.query;

    const candidat = await prisma.candidat.findMany({
      where: {
        delete_at: null,
        ...(nom && { nom: { contains: nom, mode: "insensitive" } }),
        ...(prenom && { prenom: { contains: prenom, mode: "insensitive" } }),
        ...(sexe && { sexe }),
        ...(pays_naissance && { pays_naissance }),
        ...(email && { email: { contains: email, mode: "insensitive" } }),
        ...(statut_compte && { statut_compte }),
        ...(matricule && { matricule }),
      },
      orderBy: { date_creation: "desc" },
      select: {
        nom: true,
        prenom: true,
        sexe: true,
        date_naissance: true,
        telephone: true,
        email: true,
      },
    });

    if (candidat.length === 0) {
      return res.status(404).json({ error: "Aucun candidat trouvé" });
    }

    return res.status(200).json({ data: candidat });
  }

  static async DeleteCandidat(req, res) {
    const { id_candidat } = req.params;

    const candidat = await prisma.candidat.findUnique({
      where: { id_candidat },
    });

    if (!candidat) {
      return res.status(404).json({ error: "Candidat non trouvé" });
    }

    await prisma.candidat.update({
      where: { id_candidat },
      data: { delete_at: new Date() },
    });

    const cacheKey = `candidat:*`;
    await delByPattern(cacheKey);

    // await redis.del(`candida);

    return res.status(200).json({ message: "Candidat supprimé avec succès" });
  }

  static async GetAllCandidat(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // console.log(page)

    const cachekey = `candidat:${page}:${limit}`;

    const cached = await redis.get(cachekey);
    if (cached) {
      return res.status(200).json({ candidat: JSON.parse(cached) });
    }

    // recuperer tous les candidats et les mettres en caache
  const [candidat, total] = await Promise.all([
    await prisma.candidat.findMany({
      take: limit,
      skip,
      select: {
        id_candidat: true,
        nom: true,
        prenom: true,
        type_candidat: true,
        delete_at: true,
        numero_cnib: true,
        telephone: true,
        email: true,
      },
    }) ,
    await prisma.candidat.count()
  ]);

    if (!candidat) {
      return res.status(404).json({ error: "aucun candidat trouve" });
    }
    // reucperer les inscriptions liee a cet l'utilisateur

    // console.log(candidat);
    // let resp = [];

    // for (const cand of candidat) {
    //   const inscription = await prisma.inscription.findFirst({
    //     where: {
    //       id_candidat: cand.id_candidat,
    //     },
    //     select: {
    //       date_inscription: true,
    //       centre: true,
    //       concours: {
    //         select: {
    //           nom: true,
    //           type: true,
    //           categorie: {
    //             select: {
    //               libelle: true,
    //             },
    //           },
    //         },
    //       },
    //       paiement: {
    //         select: {
    //           date_paiement: true,
    //           statut_paiement: true,
    //         },
    //       },
    //     },
    //   });

    //   resp.push({
    //     candidat: cand,
    //     concours: inscription.concours,
    //     paiement: inscription.paiement,
    //   });
    // }

    const filterD = filterDeleted(candidat, false).data;
    await redis.set(cachekey, JSON.stringify(filterD), "EX", 60);

    return res.status(200).json({
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit),
      candidat: filterD,
    });
  }

  static async DetailCandidat(req, res) {
    const { id_candidat } = req.params;
    // console.log(id_candidat)

    if (!id_candidat) {
      return res
        .status(400)
        .json({ error: "les referenses du candidats sont manquantes" });
    }

    const cacheKey = `candidat:${id_candidat}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    let resp = [];

    //au cas ou dans le cache on n'est pas de candidat

    const candidat = await prisma.candidat.findUnique({
      where: {
        id_candidat: id_candidat,
      },
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
        emploi: true,
        matricule: true,
        ministere: true,
        statut_compte: true,
        date_creation: true,

        document: {
          select: {
            id_document: true,
            fichier: true,
            url: true,
          },
        },
      },
    });

    if (!candidat || candidat.length == 0) {
      return res.status(404).json({ error: "Aucun candidat trouve" });
    }

    // if (filterOne(candidat).isSup) {
    //   return res.status(404).json({ error: "Cet candidat n\'existe pas" });
    // }

    const inscription = await prisma.inscription.findMany({
      where: {
        id_candidat: id_candidat,
      },
      include: {
        concours: {
          include: {
            categorie: true,
          },
        },
        centre: true,
        paiement: true,
      },
    });

    // trier si le candidat est direct on enleve certain champs
    let candid;

    if (candidat.matricule === null) {
      const { emploi, matricule, ministere, ...rest } = candidat;
      candid = rest;
    } else {
      candid = candidat;
    }
    resp.push({
      candidat: candid,
      inscription: inscription,
    });
    //
    // mettre en cache
    await redis.set(cacheKey, JSON.stringify({ resp }), "EX", 60);

    return res.status(200).json({ resp });
  }

  static async UpdateCandidat(req, res) {
    const { id_candidat } = req.params;

    const {
      email,
      nom_jeune_fille,
      telephone,
      mot_de_passe,
      emploi,
      ministere,
      matricule,
    } = req.body;

    if (!id_candidat)
      return res
        .status(400)
        .json({ error: "les references du candidats sont manquantes" });

    const candidat = await prisma.candidat.findUnique({
      where: {
        id_candidat,
      },
    });

    if (!candidat) {
      return res
        .status(404)
        .json({ error: "aucun candidat associer a cette reference" });
    }

    // mettre a jour le candidat

    const hash = await bcrypt.hash(mot_de_passe, 10);
    await prisma.$transaction(async (tx) => {
      const UpdateCandidat = await tx.candidat.update({
        where: {
          id_candidat: candidat.id_candidat,
        },

        data: {
          email: email ?? candidat.email,
          nom_jeune_fille: nom_jeune_fille ?? candidat.nom_jeune_fille,
          telephone: telephone ?? candidat.telephone,
          mot_de_passe: hash ?? candidat.mot_de_passe,
          emploi: emploi ?? candidat.emploi,
          ministere: ministere ?? candidat.ministere,
          matricule: matricule ?? candidat.matricule,
        },
      });

      return UpdateCandidat;
    });

    const cacheKey = `candidat:*`;

     await delByPattern(cacheKey);

    return res
      .status(200)
      .json({ message: "les informations du candidats ont ete mise a jour" });
  }

  static async RegisterCandidat(req, res) {
    try {
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
        matricule,
        emploi,
        ministere,
        statusCompte,
      } = req.body;

      // Validation et formatage du téléphone
      const { valid, formatted, message } = ValidatePhone(telephone);
      if (!valid) return res.status(400).json({ error: message });

      // Vérifier les doublons
      const conditions = [{ numero_cnib }, { telephone: formatted }];
      if (email) conditions.push({ email });

      const existant = await prisma.candidat.findFirst({
        where: { OR: conditions },
      });

      // validation du cnib

      const cni = numero_cnib.trim();

      const response = validateCnib(cni, date_delivrance);

      if (response.error) {
        return res.status(400).json(response);
      }

      // verifier le status qui dois etre parmis
      const status = ["ACTIF", "INACTIF", "SUSPENDU"];
      if (!status.includes(statusCompte)) {
        return res
          .status(400)
          .json({ error: "le status du compte n'est pas valide " });
      }

      if (existant) {
        let msg = "Numéro CNIB déjà utilisé";
        if (existant.telephone === formatted) msg = "Téléphone déjà utilisé";
        if (email && existant.email === email) msg = "Email déjà utilisé";
        return res.status(409).json({ error: msg });
      }

      const motDePasseHashe = await bcrypt.hash(mot_de_passe, 10);

      const candidat = await prisma.candidat.create({
        data: {
          nom,
          prenom,
          nom_jeune_fille: nom_jeune_fille ?? null,
          sexe,
          date_naissance: new Date(date_naissance),
          lieu_naissance,
          pays_naissance,
          numero_cnib,
          date_delivrance: date_delivrance ? new Date(date_delivrance) : null,
          telephone: formatted,
          email: email ?? null,
          mot_de_passe: motDePasseHashe,
          statut_compte: statusCompte,
          type_candidat: matricule ? "PROFESSIONNEL" : "DIRECT",
          matricule: matricule ?? null,
          emploi: emploi ?? null,
          ministere: ministere ?? null,
        },
      });

          const cacheKey = `candidat:*`;

     await delByPattern(cacheKey);

      return res.status(201).json({
        message: "le compte candidat a ete creer avec succes ",
      });
    } catch (err) {
      return res.status(500).json({
        error: "Une erreur est survenue lors de la creation du candidat",
      });
    }
  }

  static async ListesPaiements(req, res) {
    const {
      statut_paiement,
      mode_paiement,
      annee_concours,
      nom_candidat,
      prenom_candidat,
    } = req.query;

    const cacheKey = `paiements`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const where = {};

    if (statut_paiement) where.statut_paiement = statut_paiement;
    if (mode_paiement) where.mode_paiement = mode_paiement;

    if (annee_concours) {
      where.inscription = {
        concours: { annee: parseInt(annee_concours) },
      };
    }

    if (nom_candidat || prenom_candidat) {
      where.inscription = {
        ...where.inscription,
        candidat: {
          ...(nom_candidat && {
            nom: { contains: nom_candidat, mode: "insensitive" },
          }),
          ...(prenom_candidat && {
            prenom: { contains: prenom_candidat, mode: "insensitive" },
          }),
        },
      };
    }

    const [paiements, nombrePaiement] = await Promise.all([
      prisma.paiement.findMany({
        orderBy: { date_paiement: "desc" },
        select: {
          id_paiement: true,
          montant: true,
          date_paiement: true,
          mode_paiement: true,
          reference_transaction: true,
          statut_paiement: true,
          inscription: {
            select: {
              id_inscription: true,
              statut_inscription: true,
              date_inscription: true,
              candidat: {
                select: {
                  id_candidat: true,
                  nom: true,
                  prenom: true,
                  email: true,
                },
              },
              concours: {
                select: { id_concours: true, nom: true, annee: true },
              },
            },
          },
        },
      }),
      prisma.paiement.count({ where }),
    ]);

    const response = {
      data: paiements,
    };

    await redis.set(cacheKey, JSON.stringify(response), "EX", 60);
    return res.status(200).json(response);
  }
  static async DetailPaiement(req, res) {
    const { id_candidat } = req.params;

    if (!id_candidat) {
      return res.status(400).json({
        error: "id_candidat requis",
      });
    }

    const paiements = await prisma.paiement.findMany({
      where: {
        inscription: {
          id_candidat: id_candidat,
        },
      },
      select: {
        id_paiement: true,
        montant: true,
        date_paiement: true,
        mode_paiement: true,
        reference_transaction: true,
        statut_paiement: true,

        inscription: {
          select: {
            id_inscription: true,
            date_inscription: true,
            statut_inscription: true,

            concours: {
              select: {
                nom: true,
                annee: true,
                type: true,
                nombre_postes: true,
              },
            },

            candidat: {
              select: {
                id_candidat: true,
                nom: true,
                prenom: true,
                numero_cnib: true,
                date_naissance: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        date_paiement: "desc",
      },
    });

    if (!paiements.length) {
      return res.status(404).json({
        error: "Aucun paiement trouvé pour ce candidat",
      });
    }

    return res.status(200).json({
      total_paiements: paiements.length,
      data: paiements,
    });
  }

  static async UpdatePaiementStatus(req, res) {
    const id_paiement = parseInt(req.params.id_paiement);
    const { id_candidat, statut_paiement } = req.body;

    if (isNaN(id_paiement)) {
      return res.status(400).json({ error: "id_paiement invalide" });
    }

    // verifier le statut de paiement

    const statusP = statut_paiement.toUpperCase();
    if (!AdminController.#statusPaiement.includes(statusP)) {
      return res
        .status(400)
        .json({ error: "Le statut du paiement doit est incorrect" });
    }

    const [candidat, paiement] = await Promise.all([
      prisma.candidat.findUnique({ where: { id_candidat } }),
      prisma.paiement.findUnique({ where: { id_paiement } }),
    ]);

    if (!candidat) {
      return res
        .status(404)
        .json({ error: "Aucun candidat associé à ce paiement" });
    }

    if (!paiement) {
      return res.status(404).json({ error: "Aucun paiement trouvé" });
    }

    await prisma.paiement.update({
      where: { id_paiement },
      data: {
        statut_paiement: statusP ?? paiement.statut_paiement,
      },
    });

    return res
      .status(200)
      .json({ message: "Statut du paiement modifié avec succès" });
  }

  static async CreateCategorie(req, res) {
    const { libelle, description } = req.body;

    const categoriesExistantes = await prisma.categorieConcours.findMany({
      where: {
        libelle: { equals: libelle, mode: "insensitive" },
      },
      select: { libelle: true },
    });

    if (categoriesExistantes.length > 0) {
      const doublons = categoriesExistantes.map((c) => c.libelle).join(", ");
      return res
        .status(409)
        .json({ message: `Doublons trouvés : ${doublons}` });
    }

    await prisma.categorieConcours.create({
      data: {
        libelle: libelle,
        description: description,
      },
    });

    // await invaliderCache("categorieConcours");
    const cacheKey = `categorie:*`;
 await delByPattern(cacheKey);
    return res
      .status(201)
      .json({ message: "Catégorie(s) de concours créée(s) avec succès" });
  }

  static async GetCategorie(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const cacheKey = `categorie:${page}:${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const [categorie, total] = await Promise.all([
      prisma.categorieConcours.findMany({
        take: limit,
        skip,
        select: {
          id: true,
          libelle: true,
          description: true,
          flgActif: true,
        },
      }),
      prisma.categorieConcours.count(),
    ]);

    if (!categorie || categorie.length === 0) {
      return res.status(404).json({ message: "Aucune catégorie trouvée" });
    }

    const response = {
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit),
      data: categorie,
    };

    await redis.set(cacheKey, JSON.stringify(response), "EX", 60);
    return res.status(200).json(response);
  }

  static async GetCategorieConcours(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const cacheKey = `categorieConcours:${page}:${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const [categories, total] = await Promise.all([
      prisma.categorieConcours.findMany({
        orderBy: { createdDate: "desc" },
        take: limit,
        skip,
        select: {
          id: true,
          libelle: true,
          concours: { select: { id_concours: true, nom: true } },
        },
      }),
      prisma.categorieConcours.count(),
    ]);

    if (!categories || categories.length === 0) {
      return res.status(404).json({ error: "Aucune catégorie trouvée" });
    }

    const response = {
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit),
      data: categories,
    };

    await redis.set(cacheKey, JSON.stringify(response), "EX", 60);
    return res.status(200).json(response);
  }

  static async UpdateCategorieConcours(req, res) {
    const { id_categorie, libelle, description } = req.body;
    let catId;
    if (typeof id_categorie !== "number" && typeof id_categorie === "string") {
      catId = parseInt(id_categorie);
    }
    catId = id_categorie;
    const categorie = await prisma.categorieConcours.findUnique({
      where: { id: catId },
    });

    if (!categorie) {
      return res.status(404).json({ error: "Aucune catégorie trouvée" });
    }

    // console.log(req.admin.id_admin)

    await prisma.categorieConcours.update({
      where: { id: categorie.id },
      data: {
        libelle: libelle ?? categorie.libelle,
        description: description ?? categorie.description,
        // lastModifiedBy: req.admin.id_admin,
        lastModifiedDate: new Date(),
      },
    });

    // await invaliderCache("categorie");
    // await invaliderCache("categorieConcours");
      const cacheKey = `categorieConcours:*`;
     await delByPattern(cacheKey);
    return res.status(200).json({ message: "Catégorie modifiée avec succès" });
  }

  static async DeleteCategorie(req, res) {
    const id_categorie = parseInt(req.params.id_categorie);

    if (isNaN(id_categorie)) {
      return res
        .status(400)
        .json({ error: "La référence de l'id est manquante ou invalide" });
    }

    const categorie = await prisma.categorieConcours.findUnique({
      where: { id: id_categorie },
    });

    if (!categorie) {
      return res.status(404).json({ error: "Aucune catégorie trouvée" });
    }

    await prisma.categorieConcours.delete({ where: { id: id_categorie } });

        const cacheKey = `categorieConcours:*`;
 await delByPattern(cacheKey);

    return res.status(200).json({ message: "Catégorie supprimée avec succès" });
  }

  static async CreateExamen(req, res) {
    const {
      intitule,
      // type_examen,
      coefficient,
      date_examen,
      heure,
      lieu,
      id_concours,
    } = req.body;

    const concoursId = parseInt(id_concours);

    if (isNaN(concoursId)) {
      return res.status(400).json({ error: "ID de concours invalide" });
    }

    const cacheKey = `examen:*`;

 await delByPattern(cacheKey);

    const concours = await prisma.concours.findUnique({
      where: { id_concours: concoursId },
    });

    if (!concours) {
      return res.status(404).json({ error: "Concours introuvable" });
    }

    const examen = await prisma.examen.create({
      data: {
        intitule,
        // type_examen,
        // coefficient,
        date_examen: new Date(date_examen),
        heure: heure ? new Date(heure) : null,
        lieu,
        id_concours: concoursId,
      },
    });

    return res
      .status(201)
      .json({ message: "Examen créé avec succès", data: examen });
  }

  static async GetExamensByConcours(req, res) {
    const id_concours = parseInt(req.params.id_concours);

    if (isNaN(id_concours)) {
      return res.status(400).json({ error: "ID de concours invalide" });
    }

    const cacheKey = `examen:${id_concours}`;

    const data = await redis.get(cacheKey);
    if (data) {
      return res.json({ data: JSON.parse(data) });
    }
    const examens = await prisma.examen.findMany({
      where: { id_concours },
      orderBy: { date_examen: "asc" },
    });

    return res.status(200).json({ data: examens });
  }

  static async DetailExamen(req, res) {
    const id_examen = parseInt(req.params.id_examen);

    if (isNaN(id_examen)) {
      return res.status(400).json({ error: "ID d'examen invalide" });
    }

    const examen = await prisma.examen.findUnique({
      where: { id_examen },
      include: {
        concours: { select: { nom: true, annee: true } },
      },
    });

    if (!examen) {
      return res.status(404).json({ error: "Examen non trouvé" });
    }

    await redis.set(cachekey, JSON.stringify(examen), "EX", 300);
    return res.status(200).json({ data: examen });
  }

  static async UpdateExamen(req, res) {
    const id_examen = parseInt(req.params.id_examen);

    if (isNaN(id_examen)) {
      return res.status(400).json({ error: "ID d'examen invalide" });
    }

    const data = req.body;

    const examen = await prisma.examen.findUnique({ where: { id_examen } });

    if (!examen) {
      return res.status(404).json({ error: "Examen introuvable" });
    }

    const cacheKey = `examen:* `;

 await delByPattern(cacheKey);

    const updated = await prisma.examen.update({
      where: { id_examen },
      data: {
        intitule: data.intitule ?? examen.intitule,
        type_examen: data.type_examen ?? examen.type_examen,
        coefficient: data.coefficient ?? examen.coefficient,
        date_examen: data.date_examen
          ? new Date(data.date_examen)
          : examen.date_examen,
        heure: data.heure ? new Date(data.heure) : examen.heure,
        lieu: data.lieu ?? examen.lieu,
      },
    });

    return res
      .status(200)
      .json({ message: "Examen mis à jour", data: updated });
  }
  static async DeleteExamen(req, res) {
    const id_examen = parseInt(req.params.id_examen);

    if (isNaN(id_examen)) {
      return res.status(400).json({ error: "ID d'examen invalide" });
    }

    const examen = await prisma.examen.findUnique({ where: { id_examen } });

    if (!examen) {
      return res.status(404).json({ error: "Examen introuvable" });
    }

    const cacheKey = `examen:*`;

   await delByPattern(cacheKey);

    await prisma.examen.delete({ where: { id_examen } });

    return res.status(200).json({ message: "Examen supprimé avec succès" });
  }

  static async getAllExam(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const cachekey = `examen:${page}:${limit}`;

    const data = await redis.get(cachekey);

    if (data) {
      return res.status(200).json(data);
    }

      const [examen, total] = await Promise.all([
    await prisma.examen.findMany({
      take: limit,
      skip,
    }),

    await prisma.examen.count()
  ])
    await redis.set(cachekey, JSON.stringify(examen));
    return res.status(200).json({
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit),

      examen: examen,
    });
  }

  static async createLieuCompo(req, res) {
    const { nom, id_centre, quota } = req.body;

    const centre = await prisma.centre.findUnique({ where: { id_centre } });

    if (!centre) {
      return res.status(404).json({ error: "Aucun centre trouvé" });
    }

    const lieux = await prisma.lieuxComposition.create({
      data: { nom, id_centre, quota },
    });

    const cacheKey = `LieuCompo:*`;
   await delByPattern(cacheKey);

    return res.status(201).json({
      message: "Lieu de composition ajouté avec succès",
      data: lieux,
    });
  }

  static async repartirCandidats(req, res) {
    const id_concours = parseInt(req.params.id_concours);

    if (isNaN(id_concours)) {
      return res.status(400).json({ error: "id_concours invalide" });
    }

    const concours = await prisma.concours.findUnique({
      where: { id_concours },
    });

    if (!concours) {
      return res.status(404).json({ error: "Concours introuvable" });
    }

    const inscriptions = await prisma.inscription.findMany({
      where: { id_concours, statut_inscription: "VALIDEE" },
      select: {
        id_inscription: true,
        id_candidat: true,
        id_centre: true,
        candidat: { select: { nom: true, prenom: true } },
      },
    });

    if (inscriptions.length === 0) {
      return res
        .status(404)
        .json({ error: "Aucune inscription validée pour ce concours" });
    }

    const lieux = await prisma.lieuxComposition.findMany({
      include: {
        centre: true,
        compositions: { select: { id_composer: true } },
      },
    });

    if (lieux.length === 0) {
      return res
        .status(404)
        .json({ error: "Aucun lieu de composition disponible" });
    }

    const MARGE = 0.9;
    const lieuxParCentre = new Map();

    for (const lieu of lieux) {
      if (!lieuxParCentre.has(lieu.id_centre)) {
        lieuxParCentre.set(lieu.id_centre, []);
      }
      lieuxParCentre.get(lieu.id_centre).push({
        id_lieux: lieu.id_lieux,
        nom: lieu.nom,
        id_centre: lieu.id_centre,
        capacite: Math.floor(lieu.quota * MARGE),
        occupation: lieu.compositions.length,
      });
    }

    const aAffecter = [];
    const debordement = [];

    for (const inscription of inscriptions) {
      const lieuxDuCentre = lieuxParCentre.get(inscription.id_centre) ?? [];
      const lieu = lieuxDuCentre
        .filter((l) => l.occupation < l.capacite)
        .sort((a, b) => a.occupation - b.occupation)[0];

      if (lieu) {
        lieu.occupation++;
        aAffecter.push({
          id_candidat: inscription.id_candidat,
          id_concours,
          id_lieux: lieu.id_lieux,
        });
      } else {
        debordement.push(inscription);
      }
    }

    let forceAffectes = 0;

    for (const inscription of debordement) {
      const tousLesLieux = [...lieuxParCentre.values()]
        .flat()
        .sort((a, b) => a.occupation / a.capacite - b.occupation / b.capacite);

      let lieu = tousLesLieux.find((l) => l.occupation < l.capacite);

      if (!lieu) {
        lieu = tousLesLieux[0];
        forceAffectes++;
      }

      if (lieu) {
        lieu.occupation++;
        aAffecter.push({
          id_candidat: inscription.id_candidat,
          id_concours,
          id_lieux: lieu.id_lieux,
        });
      }
    }

    const [suppression, creation] = await prisma.$transaction([
      prisma.composer.deleteMany({ where: { id_concours } }),
      prisma.composer.createMany({ data: aAffecter }),
    ]);

    const resumeParLieu = {};

    for (const affectation of aAffecter) {
      const lieu = lieux.find((l) => l.id_lieux === affectation.id_lieux);
      const cle = `[${lieu.centre.nom}] ${lieu.nom}`;
      resumeParLieu[cle] = (resumeParLieu[cle] ?? 0) + 1;
    }

    return res.status(200).json({
      message: "Répartition effectuée avec succès",
      concours: concours.nom,
      total_inscrits: inscriptions.length,
      total_affectes: aAffecter.length,
      debordements: debordement.length,
      force_affectes: forceAffectes,
      anciens_supprimes: suppression.count,
      repartition_par_lieu: resumeParLieu,
    });
  }

  static async consulterRepartition(req, res) {
    const id_concours = parseInt(req.params.id_concours);

    if (isNaN(id_concours)) {
      return res.status(400).json({ error: "id_concours invalide" });
    }

    const concours = await prisma.concours.findUnique({
      where: { id_concours },
    });

    if (!concours) {
      return res.status(404).json({ error: "Concours introuvable" });
    }

    const repartitions = await prisma.composer.findMany({
      where: { id_concours },
      select: {
        id_composer: true,
        candidat: {
          select: {
            nom: true,
            prenom: true,
            numero_cnib: true,
            date_naissance: true,
          },
        },
        lieux: {
          select: {
            nom: true,
            quota: true,
            centre: { select: { nom: true } },
          },
        },
      },
      orderBy: [{ id_lieux: "asc" }, { candidat: { nom: "asc" } }],
    });

    if (repartitions.length === 0) {
      return res
        .status(404)
        .json({ error: "Aucune répartition trouvée pour ce concours" });
    }

    const parLieu = {};

    for (const r of repartitions) {
      const cle = `${r.lieux.centre.nom} — ${r.lieux.nom}`;

      if (!parLieu[cle]) {
        parLieu[cle] = {
          lieu: r.lieux.nom,
          centre: r.lieux.centre.nom,
          quota: r.lieux.quota,
          candidats: [],
        };
      }

      parLieu[cle].candidats.push({
        nom: r.candidat.nom,
        prenom: r.candidat.prenom,
        numero_cnib: r.candidat.numero_cnib,
        date_naissance: r.candidat.date_naissance,
      });
    }

    return await GenererListCandidat(
      {
        concours: concours.nom,
        annee: concours.annee,
        lieux: Object.values(parLieu),
      },
      res,
    );
  }

  static async lieuDuCandidat(req, res) {
    const id_concours = parseInt(req.params.id_concours);
    const { id_candidat } = req.params;

    if (isNaN(id_concours)) {
      return res.status(400).json({ error: "id_concours invalide" });
    }

    const affectation = await prisma.composer.findUnique({
      where: {
        id_candidat_id_concours: { id_candidat, id_concours },
      },
      select: {
        candidat: {
          select: {
            nom: true,
            prenom: true,
            numero_cnib: true,
            email: true,
            telephone: true,
          },
        },
        concours: { select: { nom: true, date_debut: true } },
        lieux: {
          select: { nom: true, centre: { select: { nom: true } } },
        },
      },
    });

    if (!affectation) {
      return res.status(404).json({
        error: "Aucune affectation trouvée pour ce candidat dans ce concours",
      });
    }

    return res.status(200).json({
      candidat: `${affectation.candidat.prenom} ${affectation.candidat.nom}`,
      cnib: affectation.candidat.numero_cnib,
      concours: affectation.concours.nom,
      date: affectation.concours.date_debut,
      centre: affectation.lieux.centre.nom,
      lieu: affectation.lieux.nom,
    });
  }

  static async InscrireCandidаt(req, res) {
    const { id_candidat } = req.body;
    const id_concours = parseInt(req.body.id_concours);
    const id_centre = parseInt(req.body.id_centre);

    if (!id_concours || isNaN(id_concours)) {
      return res.status(400).json({ error: "id_concours invalide" });
    }

    if (!id_centre || isNaN(id_centre)) {
      return res.status(400).json({ error: "id_centre est requis" });
    }

    const concours = await prisma.concours.findUnique({
      where: { id_concours },
    });

    if (!concours) {
      return res.status(404).json({ error: "Concours introuvable" });
    }

    if (concours.statut_concours !== "OUVERT") {
      return res.status(400).json({
        error: "Ce concours n'est plus ouvert aux inscriptions",
      });
    }

    const aujourd_hui = new Date();

    if (aujourd_hui < concours.date_debut || aujourd_hui > concours.date_fin) {
      return res.status(400).json({
        error: "La période d'inscription est fermée",
      });
    }

    const centreValide = await prisma.ConcoursCentre.findFirst({
      where: { concoursId: id_concours, centreId: id_centre },
    });

    if (!centreValide) {
      return res.status(400).json({
        error: "Ce centre n'est pas disponible pour ce concours",
      });
    }

    const dejaInscrit = await prisma.inscription.findFirst({
      where: { id_candidat, id_concours },
    });

    if (dejaInscrit) {
      const messageStatut =
        dejaInscrit.statut_inscription === "VALIDEE"
          ? "Vous êtes déjà inscrit et votre paiement est validé"
          : "Vous avez déjà une inscription en attente de paiement";

      return res.status(409).json({
        error: messageStatut,
        id_inscription: dejaInscrit.id_inscription,
      });
    }

    const inscription = await prisma.inscription.create({
      data: {
        statut_inscription: "EN_ATTENTE",
        candidat: { connect: { id_candidat } },
        concours: { connect: { id_concours } },
        centre: { connect: { id_centre } },
      },
      select: {
        id_inscription: true,
        date_inscription: true,
        statut_inscription: true,
        concours: { select: { nom: true, frais_inscription: true } },
        centre: { select: { nom: true } },
      },
    });

    const cacheKey = `inscription:*`;

    await delByPattern(cacheKey);
    return res.status(201).json({
      message: "Inscription créée — en attente de paiement",
      data: {
        id_inscription: inscription.id_inscription,
        date_inscription: inscription.date_inscription,
        statut_inscription: inscription.statut_inscription,
        concours: inscription.concours,
        centre: inscription.centre,
        prochaine_etape: "Effectuez le paiement pour confirmer votre dossier",
      },
    });
  }
  static async UpdateInscriptionStatus(req, res) {
    const { id_inscription, status_inscriptions } = req.body;

    if (!id_inscription) {
      return res
        .status(400)
        .json({ error: "les references de l'inscriptions sont manquantes" });
    }

    if (!status_inscriptions) {
      return res
        .status(400)
        .json({ error: "le status de l'inscriptions est manquant" });
    }

    const cacheKey = `inscription:*`;

    // verifier si le status envoyer en backend correspond biens
    const strUpstatus = status_inscriptions.toUpperCase();
    const Isvalide = AdminController.#statusInscriptions.includes(strUpstatus);

    if (!Isvalide) {
      return res
        .status(400)
        .json({ error: " le status de l'inscriptions a ete mal saisis" });
    }
    // mtn modifier le status de l'inscriptions

    const inscription = await prisma.inscription.findUnique({
      where: {
        id_inscription: parseInt(id_inscription),
      },
    });

    console.log("test inscriptions ", inscription);

    if (!inscription) {
      return res
        .status(404)
        .json({ error: "Aucune inscriptions trouvees. Veuillez reessayer" });
    }

    const updateTransaction = await prisma.$transaction(async (tx) => {
      const updateInsc = tx.inscription.update({
        where: {
          id_inscription: inscription.id_inscription,
        },
        data: {
          statut_inscription: strUpstatus ?? inscription.statut_inscription,
        },
      });

      return updateInsc;
    });

    await delByPattern(cacheKey);
    return res.status(200).json({ message: "modification du status reussi" });
  }

  /// modifier le centre d'un candidat

  static async UpddateCandidatCentre(req, res) {
    const { id_inscription, id_centre } = req.body;
    // verifier si le centres est pour ce candidat et verifier l'inscription aussi

    if (!id_inscription) {
      return res
        .status(400)
        .json({ error: "les references de l'inscriptions sont manquantes" });
    }

    if (!id_centre) {
      return res
        .status(400)
        .json({ error: "les references du centre sont manquantes" });
    }

    const cacheKey = `inscription:*`;
    const centre = await prisma.centre.findUnique({
      where: {
        id_centre: parseInt(id_centre),
      },
    });

    if (!centre) {
      return res.status(404).json({ error: "aucun centre trouver" });
    }

    // trouver le concours et les centres disponibles

    const inscription = await prisma.inscription.findUnique({
      where: {
        id_inscription: parseInt(id_inscription),
      },
      select: {
        id_concours: true,
        id_centre: true,
      },
    });

    if (!inscription) {
      return res.status(404).json({ error: "aucune inscription trouvee" });
    }

    const concours = await prisma.concours.findUnique({
      where: {
        id_concours: inscription.id_concours,
      },
      select: {
        centres: {
          select: {
            centre: {
              select: {
                nom: true,
              },
            },
          },
        },
      },
    });

    if (!concours) {
      return res.status(404).json({ error: "aucun concours trouve" });
    }

    // verifier si le centre proposer exixste dans le concours

    const isValidCentre = concours.centres.some(
      (r) => r.centre.nom === centre.nom,
    );
    if (!isValidCentre) {
      return res.status(409).json({
        error:
          "le centre selectionner n'est eligible a ce concours. \n veuillez choisir un autre centre",
      });
    }

    await prisma.$transaction(async (tx) => {
      const updateInsc = await tx.inscription.update({
        where: {
          id_inscription,
        },
        data: {
          id_centre: parseInt(id_centre) ?? inscription.id_centre,
        },
      });

      return updateInsc;
    });
     await delByPattern(cacheKey);
    return res.status(200).json({ message: "Modification du centre reussi" });
  }

  static async UploadsExamresponse(req, res) {
    try {
      // const { id_examen } = req.body;
      const file = req.file;

      // if (!id_examen) {
      //   return res.status(400).json({
      //     error: "les références de l'examen sont erronées",
      //   });
      // }

      console.log("recu ici");

      if (!file) {
        return res.status(400).json({
          error: "aucun fichier uploadé",
        });
      }

      const validExtension = ["xls", "xlsx", "xlsb", "xltx", "xltm", "csv"];

      const extension = path
        .extname(file.originalname)
        .replace(".", "")
        .toLowerCase();

      if (!validExtension.includes(extension)) {
        return res.status(400).json({
          error: `Veuillez inserer un fichier Excel ${validExtension.join(", ")}`,
        });
      }

      const workbook = xlsx.read(file.buffer, {
        type: "buffer",
      });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const data = xlsx.utils.sheet_to_json(sheet);

      if (!data.length) {
        return res.status(404).json({
          error: "le fichier ne contient pas de contenu",
        });
      }

      // console.log(data)

      const questions = data.map((item) => ({
        question: item.question || item.Question,
        responses: [item.R1, item.R2, item.R3, item.R4],
        bonneRep: item.bonneRep || item.R4,
      }));

      const responses = questions.map((d) => ({
        question: d.question,
        response: d.bonneRep,
      }));

      // si on ne connais pas le nombre de reponse a mettre.. on prend le cas ou la derniere reponse est la bonne

      /// recuperer la question et la reponse pour mettre en db

      // await prisma.$transaction(async (tx) => {});

      return res.status(200).json({
        success: true,
        count: questions.length,
        questions,
        responses,
      });
    } catch (error) {
      return res.status(500).json({
        error: error.message,
      });
    }
  }

  static async ListesConcours(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const cachekey =`concours:${page}:${limit}`

    // verifier si le cache exite 

    const data = await redis.get(cachekey);


    if(data){
      return res.status (200).json({
              page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit),
      data: JSON.parse(data),
      })
    }
    
    const [concours,total] = await Promise.all([

     await prisma.concours.findMany({
      take:limit,
      skip,
      select: {
        nom: true,
        nombre_postes: true,
        categorie: {
          select: {
            libelle: true,
          },
        },
        type: true,
        statut_concours: true,
      },
    }),

    await prisma.concours.count()
       ])

    return res.json({
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit),
      data: concours,
    });
    // generer une listes des  concours avec les informations du pays etc...

    // await GenererListConcours(concours,res)
  }

  static async UpdateCandidatInscription(req, res) {
    const { id_inscription, id_candidat, id_concours, id_centre } = req.body;
    if (!id_inscription) {
      return res
        .status(400)
        .json({ error: "La ref de l'inscription ne dois pas etre nulle" });
    }
    if (!id_candidat) {
      return res
        .status(400)
        .json({ error: "La ref du candidat ne dois pas etre nulle" });
    }
    if (!id_concours) {
      return res
        .status(400)
        .json({ error: "La ref du concours ne dois pas etre nulle" });
    }
    if (!id_centre) {
      return res
        .status(400)
        .json({ error: "La ref du centre ne dois pas etre nulle" });
    }

    const inscription = await prisma.inscription.findFirst({
      where: {
        id_candidat: id_candidat,
        id_inscription: parseInt(id_inscription),
        // id_concours: parseInt (id_concours),
        // id_centre: parseInt(id_centre),
      },
    });

    if (!inscription) {
      return res.status(404).json({ error: "Aucune information trouvee" });
    }

    await prisma.$transaction(async (tx) => {
      const updateInscription = await tx.inscription.update({
        where: {
          id_centre,
        },
        data: {
          id_centre: parseInt(id_centre) ?? inscription.id_centre,
          id_concours: parseInt(id_concours) ?? inscription.id_concours,
          update_at: new Date(),
        },
      });
      return updateInscription;
    });

    const cacheKey = `inscription:*`;
 await delByPattern(cacheKey);

    return res.json({ message: "Inscriptions modifier avec succes" });
  }

  static async DeleteCandidatInscription(req, res) {
    const id_inscription = parseInt(req.params.id_inscription);

    if (!id_inscription) {
      return res
        .status(400)
        .json({ error: "La ref de l'inscription ne dois pas etre nulle" });
    }

    const inscription = await prisma.inscription.findUnique({
      where: {
        id_inscription: id_inscription,
      },
    });
    if (!inscription) {
      return res.status(404).json({ error: "Aucune Inscription trouvee" });
    }
    const cacheKey = `inscription:*`;
    await prisma.$transaction(async (tx) => {
      //  return await tx.inscription.delete({
      //   where:{id_inscription: inscription.id_inscription}
      //  })

      return await tx.inscription.update({
        where: { id_inscription: inscription.id_inscription },
        data: {
          delete_at: new Date(),
        },
      });
    });

 await delByPattern(cacheKey);
    return res
      .status(200)
      .json({ message: "Inscription supprimer avec succes " });
  }

  static async InscrtiptionCandidat(req, res) {
    const { id_candidat } = req.params;
    if (!id_candidat) {
      return res
        .status(400)
        .json({ error: "Les references du candidats sont manquantes" });
    }
    // les donnner de caches
    const cacheKey = `inscription:${id_candidat}`;
    const data = await redis.get(cacheKey);

    if (data) {
      return res.json({ InscCandidat: JSON.parse(data) });
    }

    const candidat = await prisma.candidat.findUnique({
      where: {
        id_candidat,
      },
    });
    if (!candidat) {
      return res.status(404).json({ error: "Aucun candidat trouvee" });
    }

    const inscription = await prisma.inscription.findMany({
      where: {
        id_candidat: candidat.id_candidat,
      },
    });

    await redis.set(cacheKey, JSON.stringify(inscription), "EX", 300);
    return res.json({ InscCandidat: inscription });
  }

  static async UpdateAdmin(req, res) {
    const { id_admin } = req.params;
    const { nom, prenom, role } = req.body;
    if (!id_admin) {
      return res
        .status(400)
        .json({ error: "La reference de l'admin est requise" });
    }
    const cachekey = "admin";

    const admin = await prisma.admin.findUnique({
      where: {
        id_admin: id_admin,
      },
    });

    if (!admin) {
      return res.status(404).json({ error: "Aucun administrateur trouve" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.admin.update({
        where: {
          id_admin: admin.id_admin,
        },
        data: {
          nom: nom ?? admin.nom,
          prenom: prenom ?? admin.prenom,
          role: role ?? admin.role,
        },
      });
    });

 await delByPattern(cachekey);
    return res.status(200).json({ message: "Admin modifier avec succes" });
  }

  static async DeleteAdmin(req, res) {
    const { id_admin } = req.params;
    const { nom, prenom, role } = req.body;
    if (!id_admin) {
      return res
        .status(400)
        .json({ error: "La reference de l'admin est requise" });
    }

    const cachekey = "admin";

    const [admin, total] = await Promise.all([
      prisma.admin.findUnique({
        where: {
          id_admin: id_admin,
        },
      }),
      prisma.admin.count(),
    ]);

    if (!admin) {
      return res.status(404).json({ error: "Aucun administrateur trouve" });
    }

    // verifier s'il reste un seul admin suppression est impossible \
    if (total == 1) {
      return res.status(400).json({
        error:
          "Un erreur est survenue , impossible de supprimer l'adminisrateur ",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.admin.delete({
        where: {
          id_admin: admin.id_admin,
        },
      });

 await delByPattern(cachekey);
      return res.status(200).json({ message: "Admin supprimer avec succes" });
    });
  }

  static async GetAllAdmin(req, res) {
    const cachekey = "admin";
    const data = await redis.get(cachekey);
    if (data) {
      return res.status(200).json({ data: JSON.parse(data) });
    }

    const admin = await prisma.admin.findMany({
      orderBy: {
        date_creation: "desc",
      },
    });

    const admins = AdminRessource(admin);

    await redis.set(cachekey, JSON.stringify(admins), "EX", 300);

    return res.json({ data: admins });
  }

  static async GetAllCentre(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

      const [centre, total] = await Promise.all([
     await prisma.centre.findMany({
      take: limit,
      skip,
      orderBy: {
        nom: "asc",
      },
    }),
    await prisma.centre.count()
  ]);
    return res.json({
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit),
      data: centre,
    });
  }

  static async GetAllInscription(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const cacheKey = `inscription`;
    const data = await redis.get(cacheKey);
    if (data) {
      return res.json({ data: JSON.parse(data) });
    }
      const [insc, total] = await Promise.all([
     await prisma.inscription.findMany({
      where: {
        delete_at: null,
      },
      take: limit,
      skip,
      select: {
        id_inscription: true,
        date_inscription: true,
        delete_at: true,
        statut_inscription: true,
        candidat: {
          select: {
            id_candidat: true,
            nom: true,
            prenom: true,
            email: true,
            type_candidat: true,
            lieu_naissance: true,
          },
        },
        concours: {
          select: {
            id_concours: true,
            nom: true,
          },
        },
        diplomes: {
          select: {
            url: true,
          },
        },
        // paiement: {
        //   select: {
        //     id_paiement: true,
        //     mode_paiement: true,
        //   },
        // },
      },
    }),
    await prisma.inscription.count()
  ])
    let is = filterDeleted(insc).data;
    console.log(is);

    const grouped = is.reduce((acc, ins) => {
      const id = ins.candidat.id_candidat;

      if (!acc[id]) {
        acc[id] = {
          candidat: ins.candidat,
          inscriptions: [],
        };
      }

      acc[id].inscriptions.push({
        id_inscription: ins.id_inscription,
        date_inscription: ins.date_inscription,
        statut_inscription: ins.statut_inscription,
        concours: ins.concours,
      });

      return acc;
    }, {});

    await redis.set(cacheKey, JSON.stringify(grouped), "EX", 300);

    return res.json({
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit),

      data: grouped,
    });
  }

  static asyncUpdateInscription(req, res) {
    const id_inscription = parseIn(req.params.id_inscription);
    // ajouter les autres data modifiables
    const { id_candidat, statut_inscription, id_concours, id_centre } =
      req.body;

    // centre, statut,
    if (!id_inscription) {
      return res
        .status(400)
        .json({ error: "La reference de l\'inscription est requise" });
    }
    // const inscription = await prisma
  }

  static async DetailInscription(req, res) {
    const { id_inscription } = req.params;

    if (!id_inscription) {
      return res
        .status(400)
        .json({ error: "La reference de l'inscription est requise" });
    }

    let valid_id = id_inscription;
    if (typeof id_inscription && typeof id_inscription !== "number") {
      valid_id = parseInt(id_inscription);
    } else {
      return res.status(400).json({
        error: "Le type de la reference de l'inscription est invalide",
      });
    }

    // cache

    const cacheKey = `inscription:${id_inscription}`;

    const data = await redis.get(cacheKey);

    if (data) {
      return res.json({ data: JSON.parse(data) });
    }

    const inscription = await prisma.inscription.findFirst({
      where: {
        id_inscription: valid_id,
      },

      select: {
        date_inscription: true,
        statut_inscription: true,
        delete_at: true,
        centre: {
          select: {
            id_centre: true,
            nom: true,
            delete_at: true,
          },
        },
        candidat: {
          select: {
            id_candidat: true,
            nom: true,
            prenom: true,
            email: true,
            type_candidat: true,
            lieu_naissance: true,
          },
        },
        concours: {
          select: {
            nom: true,
            nombre_postes: true,
            statut_concours: true,
            categorie: {
              select: {
                libelle: true,
              },
            },
          },
        },
        diplomes: {
          select: {
            url: true,
          },
        },
      },
    });

    if (!id_inscription) {
      return res.status(404).json({ error: "Aucune inscription trouvee" });
    }

    const insc = filterOne(inscription).data;

    if (!insc) {
      return res.status(404).json({ error: "Cette inscription n'existe pas" });
    }

    // await redis.del(cacheKey);
    await redis.set(cacheKey, JSON.stringify(inscription), "EX", 120);

    return res.json({ data: inscription });
  }

  static async PaiementByCandidat(req, res) {
    const paiements = await prisma.paiement.findMany({
      select: {
        id_paiement: true,
        montant: true,
        date_paiement: true,
        inscription: {
          select: {
            id_inscription: true,
            date_inscription: true,
            statut_inscription: true,
            concours: true,
            candidat: {
              select: {
                id_candidat: true,
                prenom: true,
                nom: true,
              },
            },
          },
        },
      },
    });

    const grouped = paiements.reduce((acc, p) => {
      const candidat = p.inscription.candidat;
      const id = candidat.id_candidat;

      if (!acc[id]) {
        acc[id] = {
          candidat,
          paiements: [],
        };
      }

      acc[id].paiements.push({
        id_paiement: p.id_paiement,
        montant: p.montant,
        date_paiement: p.date_paiement,
        inscription: {
          id_inscription: p.inscription.id_inscription,
          date_inscription: p.inscription.date_inscription,
          statut_inscription: p.inscription.statut_inscription,
          concours: p.inscription.concours,
        },
      });

      return acc;
    }, {});

    return res.status(200).json({
      data: Object.values(grouped),
    });
  }

  static async ProfileAdmin(req, res) {
    const { id_admin } = req.admin;
    if (!id_admin) {
      return res
        .status(400)
        .json({ error: "Les references de l'administrateur sont requise" });
    }
    const admin = await prisma.admin.findFirst({
      where: {
        id_admin: id_admin,
      },
      select: {
        id_admin: true,
        nom: true,
        prenom: true,
        role: true,
      },
    });

    if (!admin) {
      return res
        .status(404)
        .json({ error: "Aucun admin n'est associe avec ses references" });
    }

    return res.status(200).json({ data: admin });
  }

  static async ConcoursCentre(req, res) {
    const id_concours = parseInt(req.params.id_concours);
    if (!id_concours) {
      return res
        .status(400)
        .json({ error: "Les references du concours sont requises" });
    }

    // avant tout verifier si le concours est valide

    const concours = await prisma.concours.findFirst({
      where: {
        id_concours: id_concours,
      },
    });

    if (!concours) {
      return res
        .status(404)
        .json({ error: "Aucun concours associe a cette reference" });
    }
    const centres = await prisma.concoursCentre.findMany({
      where: {
        concoursId: concours.id_concours,
      },
      include: {
        centre: true,
      },
    });

    if (!centres || centres.length === 0) {
      return res.status(404).json({
        error:
          "Ce concours n'a aucun centre.Veuillez ajouter des centres pour ce concours",
      });
    }

    const centre = centres.map((c) => ({
      id_centre: c.centre.id_centre,
      nom: c.centre.nom,
    }));
    return res.status(200).json({
      data: centre,
    });
  }

  static async nbCandidatsByconcours(req, res) {
    const cacheKey = "candidatParInscriptions";

    const data = await redis.get(cacheKey);

    // if (data) {
    //   return res.status(200).json({ data: JSON.parse(data) });
    // }

    const inscription = await prisma.inscription.findMany({
      where: {
        delete_at: null,
        // statut_inscription:'VALIDEE',
      },
      select: {
        id_inscription: true,
        concours: true,
        id_candidat: true,
        paiement: true,
      },
    });
    let montantTotalGlobal = 0;
    const resultMap = new Map();

    inscription.forEach((i) => {
      const id = i.concours.id_concours;

      if (!resultMap.has(id)) {
        resultMap.set(id, {
          id_inscription: i.id_inscription,
          nom: i.concours.nom,
          Nbinscri: 0,
          Nbpaye: 0,
        });
      }

      const data = resultMap.get(id);

      data.Nbinscri += 1;

      const paiementsReussis =
        i.paiement?.filter((p) => p.statut_paiement === "REUSSI") || [];

      if (paiementsReussis.length > 0) {
        data.Nbpaye += 1;

        montantTotalGlobal += paiementsReussis.reduce(
          (sum, p) => sum + Number(p.montant || 0),
          0,
        );
      }
    });
    const candidabyconcours = [...resultMap.values()];

    const sortie = {
      montantTotalGlobal,
      candidabyconcours,
    };

    await redis.set(cacheKey, JSON.stringify(sortie), "EX", 300);

    return res.status(200).json({ data: sortie });
  }

  static async CharCirculaire(req, res) {
    const candidats = await prisma.candidat.findMany({
      where: {
        delete_at: null,
      },
    });

    const now = new Date();

    const startOfThisWeek = new Date(now);
    const day = now.getDay() || 7;
    startOfThisWeek.setHours(0, 0, 0, 0);
    startOfThisWeek.setDate(now.getDate() - day + 1);

    const endOfThisWeek = new Date(startOfThisWeek);
    endOfThisWeek.setDate(startOfThisWeek.getDate() + 6);
    endOfThisWeek.setHours(23, 59, 59, 999);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setMilliseconds(-1);

    const thisWeek = candidats.filter((c) => {
      const date = new Date(c.date_creation);
      return date >= startOfThisWeek && date <= endOfThisWeek;
    });

    const lastWeek = candidats.filter((c) => {
      const date = new Date(c.date_creation);
      return date >= startOfLastWeek && date <= endOfLastWeek;
    });

    const total = candidats.length;

    const nouveau = thisWeek.length;
    const ancien = lastWeek.length;
    const autres = total - (nouveau + ancien);

    const data = {
      total,
      thisWeek: nouveau,
      lastWeek: ancien,
      autres,
    };

    return res.status(200).json({
      data: data,
    });
  }

  static async AllCandidatConcours(req, res) {
    const id_concours = parseInt(req.params.id_concours);

    if (!id_concours) {
      return res
        .status(400)
        .json({ error: "La reference du concours est requise" });
    }

    // trouver les incriptions lier a ce concours qu'il soit payant ou pas

    // verifier si le
    const inscription = await prisma.inscription.findMany({
      where: {
        id_concours: id_concours,
        delete_at: null,
      },

      select: {
        statut_inscription: true,
        date_inscription: true,
        candidat: {
          select: {
            id_candidat: true,
            nom: true,
            prenom: true,
            email: true,
          },
        },
      },
    });

    if (inscription.length === 0) {
      return res.json([]);
    }

    return res.status(200).json(inscription);
  }
  static async SortieResultat(req, res) {
    // const {id_examen} = req.body;
    // if(!id_examen) {
    //   return res.status(400).json({error: 'Les references de  l\'examen sont manquantes'});
    // }

    // recuperer les questions et responses

    const exmanenResult = await prisma.examen.findFirst({
      where: {
        id_examen: id_examen,
      },
    });

    const data = {};

    const workbook = xlsx.utils.book_new();

    const worksheet = xlsx.utils.json_to_sheet(exmanenResult);

    xlsx.utils.book_append_sheet(workbook, worksheet, "reponses");

    if (!fs.existsSync("./exports")) {
      fs.mkdirSync("./exports/responses.xls");
    }

    // permettre le telecharement du fichier
  }

  static async CreateClient(req, res) {
    const normalizeHeure = (value) => {
      if (value === null || value === undefined || value === "") {
        return null;
      }

      if (typeof value === "number") {
        const secondsInDay = 24 * 60 * 60;
        const totalSeconds = Math.round(value * secondsInDay);
        const seconds = totalSeconds % secondsInDay;

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        return [
          String(hours).padStart(2, "0"),
          String(minutes).padStart(2, "0"),
          String(secs).padStart(2, "0"),
        ].join(":");
      }

      let heure = String(value).trim();

      heure = heure.replace(/[’‘'"]/g, "").trim();

      if (/^\d{1,2}:\d{2}$/.test(heure)) {
        heure = `${heure}:00`;
      }

      const match = heure.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);

      if (!match) {
        throw new Error(`Heure invalide : "${value}"`);
      }

      const [, h, m, s] = match;

      const hours = Number(h);
      const minutes = Number(m);
      const seconds = Number(s);

      if (
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59 ||
        seconds < 0 ||
        seconds > 59
      ) {
        throw new Error(`Heure invalide : "${value}"`);
      }

      return [
        String(hours).padStart(2, "0"),
        String(minutes).padStart(2, "0"),
        String(seconds).padStart(2, "0"),
      ].join(":");
    };

    try {
      const { type: rawType } = req.body || {};
      const file = req.file;

      const type = String(rawType || "")
        .toLowerCase()
        .trim();

      const type_create = [
        "candidat",
        "concours",
        "inscription",
        "examen",
        "centre",
      ];

      if (!type_create.includes(type)) {
        return res.status(400).json({
          error: "Cette action ne peut pas être effectuée",
        });
      }

      if (!file) {
        return res.status(400).json({
          error: "Aucun fichier uploadé",
        });
      }

      const validExtension = ["xls", "xlsx", "xlsb", "xltx", "xltm", "csv"];

      const extension = path
        .extname(file.originalname)
        .replace(".", "")
        .toLowerCase();

      if (!validExtension.includes(extension)) {
        return res.status(400).json({
          error: `Veuillez insérer un fichier Excel : ${validExtension.join(", ")}`,
        });
      }

      const cand = [
        "nom",
        "prenom",
        "sexe",
        "date_naissance",
        "lieu_naissance",
        "pays_naissance",
        "numero_cnib",
        "date_delivrance",
        "telephone",
        "email",
        "mot_de_passe",
        "statut_compte",
        "type_candidat",
      ];

      const concours = [
        "nom",
        "type",
        "nombres_postes",
        "annee",
        "date_debut",
        "date_fin",
        "categorie",
        "centres",
      ];

      const inscri = [
        "id_candidat",
        "id_concours",
        "id_centre",
        "statut_inscription",
      ];

      const centr = ["nom"];

      const examen = ["date_examen", "heure", "intitule", "id_concours"];

      const types = {
        candidat: cand,
        concours: concours,
        inscription: inscri,
        centre: centr,
        examen: examen,
      };

      const workbook = xlsx.read(file.buffer, {
        type: "buffer",
      });

      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        return res.status(400).json({
          error: "Aucune feuille trouvée dans le fichier",
        });
      }

      const sheet = workbook.Sheets[sheetName];

      const data = xlsx.utils.sheet_to_json(sheet, {
        defval: null,
      });

      if (!data.length) {
        return res.status(404).json({
          error: "Le fichier ne contient pas de contenu",
        });
      }

      const normalizedData = data.map((row) => {
        const newRow = {};

        Object.entries(row).forEach(([key, value]) => {
          newRow[String(key).toLowerCase().trim()] = value;
        });

        return newRow;
      });

      const keys = [
        ...new Set(normalizedData.flatMap((row) => Object.keys(row))),
      ];

      const currentType = types[type] || [];

      const missingFields = currentType.filter(
        (field) => !keys.includes(field.toLowerCase()),
      );

      if (missingFields.length > 0) {
        return res.status(400).json({
          error: `Tous les champs du module ${type} sont requis.`,
          champs_manquants: missingFields,
        });
      }

      switch (type) {
        case "candidat": {
          const candidatExist = await Promise.all(
            normalizedData.map(async (c) => {
              const OR = [];

              if (c.numero_cnib) {
                OR.push({
                  numero_cnib: String(c.numero_cnib).trim(),
                });
              }

              if (c.email) {
                OR.push({
                  email: String(c.email).trim(),
                });
              }

              if (c.telephone) {
                OR.push({
                  telephone: String(c.telephone).trim(),
                });
              }

              if (!OR.length) return null;

              return prisma.candidat.findFirst({
                where: { OR },
              });
            }),
          );

          const candidatsAInserer = normalizedData.filter(
            (_, index) => !candidatExist[index],
          );

          if (candidatsAInserer.length > 0) {
            await prisma.candidat.createMany({
              data: candidatsAInserer.map((c) => ({
                nom: c.nom != null ? String(c.nom).trim() : null,

                prenom: c.prenom != null ? String(c.prenom).trim() : null,

                sexe: c.sexe != null ? String(c.sexe).trim() : null,

                date_naissance: c.date_naissance
                  ? new Date(c.date_naissance)
                  : null,

                lieu_naissance:
                  c.lieu_naissance != null
                    ? String(c.lieu_naissance).trim()
                    : null,

                pays_naissance:
                  c.pays_naissance != null
                    ? String(c.pays_naissance).trim()
                    : null,

                numero_cnib:
                  c.numero_cnib != null ? String(c.numero_cnib).trim() : null,

                date_delivrance: c.date_delivrance
                  ? new Date(c.date_delivrance)
                  : null,

                telephone:
                  c.telephone != null ? String(c.telephone).trim() : null,

                email: c.email != null ? String(c.email).trim() : null,

                mot_de_passe:
                  c.mot_de_passe != null ? String(c.mot_de_passe) : null,

                statut_compte:
                  c.statut_compte != null
                    ? String(c.statut_compte).trim()
                    : null,

                type_candidat:
                  c.type_candidat != null
                    ? String(c.type_candidat).trim()
                    : null,
              })),
              skipDuplicates: true,
            });
          }

          break;
        }

        case "centre": {
          const exist = await Promise.all(
            normalizedData.map(async (f) => {
              return prisma.centre.findFirst({
                where: {
                  nom: {
                    equals: String(f.nom).trim(),
                    mode: "insensitive",
                  },
                },
              });
            }),
          );

          const centresAInserer = normalizedData.filter(
            (_, index) => !exist[index],
          );

          if (centresAInserer.length > 0) {
            await prisma.centre.createMany({
              data: centresAInserer.map((f) => ({
                nom: String(f.nom).trim(),
              })),
              skipDuplicates: true,
            });
          }

          break;
        }

        case "concours": {
          for (const f of normalizedData) {
            const concoursExiste = await prisma.concours.findFirst({
              where: {
                nom: {
                  equals: String(f.nom).trim(),
                  mode: "insensitive",
                },
              },
              select: {
                id_concours: true,
                nom: true,
              },
            });

            if (concoursExiste) {
              console.log(`Concours déjà existant : ${f.nom}`);
              continue;
            }

            let categorie = await prisma.categorieConcours.findFirst({
              where: {
                libelle: {
                  equals: String(f.categorie).trim(),
                  mode: "insensitive",
                },
              },
              select: {
                id: true,
                libelle: true,
              },
            });

            if (!categorie) {
              categorie = await prisma.categorieConcours.create({
                data: {
                  libelle: String(f.categorie).trim(),
                },
                select: {
                  id: true,
                  libelle: true,
                },
              });
            }

            const nomsCentres = f.centres
              ? String(f.centres)
                  .split(",")
                  .map((nom) => nom.trim())
                  .filter(Boolean)
              : [];

            const centres = [];

            for (const nomCentre of nomsCentres) {
              let centre = await prisma.centre.findFirst({
                where: {
                  nom: {
                    equals: nomCentre,
                    mode: "insensitive",
                  },
                },
                select: {
                  id_centre: true,
                  nom: true,
                },
              });

              if (!centre) {
                centre = await prisma.centre.create({
                  data: {
                    nom: nomCentre,
                  },
                  select: {
                    id_centre: true,
                    nom: true,
                  },
                });
              }

              centres.push(centre);
            }

            console.log(f);

            const nouveauConcours = await prisma.concours.create({
              data: {
                nom: String(f.nom).trim(),
                type: String(f.type).trim(),
                nombre_postes: Number(f.nombres_postes),
                annee: Number(f.annee),
                date_debut: new Date(f.date_debut),
                date_fin: new Date(f.date_fin),
                frais_inscription: 800,
                categorie: {
                  connect: {
                    id: categorie.id,
                  },
                },
              },
              select: {
                id_concours: true,
                nom: true,
              },
            });

            if (centres.length > 0) {
              await prisma.concoursCentre.createMany({
                data: centres.map((centre) => ({
                  concoursId: nouveauConcours.id_concours,
                  centreId: centre.id_centre,
                })),
                skipDuplicates: true,
              });
            }
          }

          break;
        }

        case "inscription": {
          const inscriptions = normalizedData.map((f) => ({
            id_candidat: f.id_candidat,
            id_concours: Number(f.id_concours),
            id_centre: Number(f.id_centre),
            statut_inscription: f.statut_inscription,
          }));

          const exist = await Promise.all(
            inscriptions.map(async (f) => {
              return prisma.inscription.findFirst({
                where: {
                  id_candidat: f.id_candidat,
                  id_concours: f.id_concours,
                },
              });
            }),
          );

          const inscriptionsAInserer = inscriptions.filter(
            (_, index) => !exist[index],
          );

          const inscriptionsValides = [];

          for (const inscription of inscriptionsAInserer) {
            const candidat = await prisma.candidat.findUnique({
              where: {
                id_candidat: inscription.id_candidat,
              },
            });

            if (!candidat) {
              console.log(`Candidat inexistant : ${inscription.id_candidat}`);
              continue;
            }

            const concours = await prisma.concours.findUnique({
              where: {
                id_concours: inscription.id_concours,
              },
            });

            if (!concours) {
              console.log(`Concours inexistant : ${inscription.id_concours}`);
              continue;
            }

            const centre = await prisma.centre.findUnique({
              where: {
                id_centre: inscription.id_centre,
              },
            });

            if (!centre) {
              console.log(`Centre inexistant : ${inscription.id_centre}`);
              continue;
            }

            inscriptionsValides.push(inscription);
          }

          if (inscriptionsValides.length > 0) {
            await prisma.inscription.createMany({
              data: inscriptionsValides,
              skipDuplicates: true,
            });
          }

          break;
        }

        case "examen": {
          const examens = normalizedData.map((f) => {
            const heureNormalisee = normalizeHeure(f.heure);

            if (!heureNormalisee) {
              throw new Error(
                `L'heure est obligatoire pour l'examen "${f.intitule}"`,
              );
            }

            return {
              date_examen: new Date(f.date_examen),
              heure: new Date(`1970-01-01T${heureNormalisee}.000Z`),
              intitule: f.intitule != null ? String(f.intitule).trim() : null,
              id_concours: Number(f.id_concours),
            };
          });

          await prisma.examen.createMany({
            data: examens,
            skipDuplicates: true,
          });

          break;
        }
      }

      return res.status(200).json({
        message: `Importation ${type} effectuée avec succès`,
        nombre: normalizedData.length,
        keys,
      });
    } catch (error) {
      console.error("Erreur CreateClient :", error);

      return res.status(500).json({
        error: "Erreur lors de l'importation",
      });
    }
  }

  static async PutResultat(req, res) {
    // recevoir les resultats en un ou en masse
    const { id_concours, id_examen } = req.params;
    const correction = new CorrectionRep();
    // recuperations des donnees

    const data = correction.RecupCorrection(id_concours);

    if (!data.success) {
      return res.status(500).json({
        error: "Une erreur est survenue lors de la recuperations des donnees ",
      });
    }

    const rep = data.data;
    // ajouter les resultats
    await prisma.$transaction(async (tx) => {
      for (const e of rep) {
        await tx.resultat.createMany({
          data: {
            id_concours: id_concours,
            id_examen: id_examen,
            note_cg: e.note_cg,
            note_sp: e.note_sp,
            id_candidat: e.id_candidat,
          },
        });
      }
    });

    return res
      .status(200)
      .json({ message: "Les resultats pour cet examen ont ete mise a jour" });
  }

  static async getResultat(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const CacheKey = "resultat";
    // verfier si les donnees existe en cache
    const data = await redis.get(CacheKey);

    if (data) {
      return res.status(200).json({ resultat: data });
    }

    const [resultat,total]= await Promise.all([
        await prisma.resultat.findMany({
      select: {
        id_concours: true,
        note_cg: true,
        note_sp: true,
        candidat: {
          select: {
            nom: true,
            prenom: true,
          },
        },
      },
    }),

    await prisma.resultat.count()

    ]); 


    const marge = 60;
    const rs = resultat.map((f) => ({
      ...f,
      moyenne: (marge / 100) * f.note_sp + ((100 - marge) / 100) * f.note_cg,
    }));

    await redis.set(CacheKey, JSON.stringify(rs), "EX", 300);

    return res.status(200).json({ 
           page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit),
      data: rs 
    });
  }

  // static async GetResultFirts (req,res){

  //   const exm = await prisma.examen.findMany({
  //     where:{},
  //     select:{
  //       id_examen:true,
  //       // concours:{}

  //     }
  //   })
  // }
}
