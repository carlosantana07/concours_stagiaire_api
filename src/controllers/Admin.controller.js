import { prisma } from "../prisma.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {
  generateReceipt,
  GenererListCandidat,
} from "../services/Upload-file.service.js";
import { connection as redis } from "../config/redis.js";
import { to } from "../utils/to.js";

async function invaliderCache(prefixe, nbPages = 10) {
  for (let page = 1; page <= nbPages; page++) {
    await redis.del(`${prefixe}:${page}:limit:10`);
  }
}

export class AdminController {
  static #statusInscriptions = ["EN_ATTENTE", "VALIDEE", "ANNULEE"];

  static async Register(req, res) {
    const { email, mot_de_passe, nom, prenom, telephone, role } = req.body;

    if (await prisma.admin.findUnique({ where: { email } })) {
      return res
        .status(409)
        .json({ error: "Vous avez déjà un compte, veuillez vous connecter" });
    }

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
    ] = await Promise.all([
      prisma.concours.count(),
      prisma.concours.count({ where: { statut_concours: "ouvert" } }),
      prisma.inscription.count(),
      prisma.inscription.count({ where: { statut_inscription: "EN_ATTENTE" } }),
      prisma.inscription.count({ where: { statut_inscription: "VALIDEE" } }),
      prisma.inscription.count({ where: { statut_inscription: "ANNULEE" } }),
      prisma.candidat.count({ where: { deletedAt: null } }),
      prisma.candidat.count({
        where: { type_candidat: "DIRECT", deletedAt: null },
      }),
      prisma.candidat.count({
        where: { type_candidat: "PROFESSIONNEL", deletedAt: null },
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
    ]);

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

    const cacheKey = `concours:page${page}:limit:${limit}`;
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
          _count: { select: { inscription: true } },
          categorie: { select: { id: true, libelle: true, description: true } },
        },
      }),
      prisma.concours.count(),
    ]);

    const response = {
      page,
      limit,
      total,
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

    for (let page = 1; page <= 10; page++) {
      await redis.del(`concours:page${page}:limit:10`);
    }

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
        deletedAt: null,
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
    const { id_candidat } = req.body;

    const candidat = await prisma.candidat.findUnique({
      where: { id_candidat },
    });

    if (!candidat) {
      return res.status(404).json({ error: "Candidat non trouvé" });
    }

    await prisma.candidat.update({
      where: { id_candidat },
      data: { deletedAt: new Date() },
    });

    const cacheKey = `candidat:${id_candidat}`;
    await redis.del(cacheKey);
    for (let page = 1; page <= 10; page++) {
      await redis.del(`candidat:${page}:limit:10`);
    }

    return res.status(200).json({ message: "Candidat supprimé avec succès" });
  }

  static async GetAllCandidat(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // console.log(page)

    const cachekey = `candidat:page:${page}:limit:${limit}`;

    const cached = await redis.get(cachekey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    // recuperer tous les candidats et les mettres en caache

    const candidat = await prisma.candidat.findMany({
      take: limit,
      skip,
      select: {
        id_candidat: true,
        nom: true,
        prenom: true,
        type_candidat: true,
      },
    });

    if (!candidat) {
      return res.status(404).json({ error: "aucun candidat trouve" });
    }
    // reucperer les inscriptions liee a cet l'utilisateur

    let resp = [];

    for (const cand of candidat) {
      const inscription = await prisma.inscription.findFirst({
        where: {
          id_candidat: cand.id_candidat,
        },
        select: {
          date_inscription: true,
          centre: true,
          concours: {
            select: {
              nom: true,
              type: true,
              categorie: {
                select: {
                  libelle: true,
                },
              },
            },
          },
          paiement: {
            select: {
              date_paiement: true,
              statut_paiement: true,
            },
          },
        },
      });

      resp.push({
        candidat: cand,
        concours: inscription.concours,
        paiement: inscription.paiement,
      });
    }

    await redis.set(cachekey, JSON.stringify(resp), "EX", 60);

    return res.status(200).json({ resp });
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
      },
    });

    if (!candidat || candidat.length == 0) {
      return res.status(404).json({ error: "aucun candidat trouve" });
    }

    const inscription = await prisma.inscription.findMany({
      where: {
        id_candidat: id_candidat,
      },
      include:{
        concours:{
          include:{
            categorie:true
          }
        },
        centre:true,
        paiement:true
        
      }
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
    await redis.set(cacheKey, JSON.stringify(resp), "EX", 60);

    return res.status(200).json({ resp });
  }

  static async UpdateCandidat(req,res){
    const {id_candidat} = req.params;

    const {email,nom_jeune_fille, telephone, mot_de_passe, emploi, ministere, matricule} = req.body;

    if(!id_candidat) return res.status(400).json({error: 'les references du candidats sont manquantes'});

    const candidat = await prisma.candidat.findUnique({
      where:{
        id_candidat
      }
    });

    if(!candidat){
      return res.status(404).json({error: 'aucun candidat associer a cette reference'})
    }

    // mettre a jour le candidat 

    await  prisma.$transaction (async(tx)=>{
      const UpdateCandidat = await tx.candidat.update({
        where:{
          id_candidat: candidat.id_candidat
        },

        data:{
          email: email ?? candidat.email,
          nom_jeune_fille: nom_jeune_fille ?? candidat.nom_jeune_fille,
          telephone: telephone ?? candidat.telephone,
          mot_de_passe: mot_de_passe ?? candidat.mot_de_passe,
          emploi: emploi ?? candidat.emploi,
          ministere : ministere ?? candidat.ministere,
          matricule: matricule ?? candidat.matricule
        }
      });

      return UpdateCandidat;
    });

    const cacheKey = `candidat:${id_candidat}`;

    await redis.del(cacheKey);

    return res.status(200).json({message: 'les informations du candidats ont ete mise a jour'});

  }



  static async ListesPaiements(req, res) {
    const {
      statut_paiement,
      mode_paiement,
      annee_concours,
      nom_candidat,
      prenom_candidat,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const cacheKey = `paiements:${pageNumber}:${limitNumber}:${statut_paiement || ""}:${mode_paiement || ""}:${annee_concours || ""}:${nom_candidat || ""}:${prenom_candidat || ""}`;

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
        where,
        skip,
        take: limitNumber,
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
      page: pageNumber,
      limit: limitNumber,
      total: nombrePaiement,
      totalPages: Math.ceil(nombrePaiement / limitNumber),
      data: paiements,
    };

    await redis.set(cacheKey, JSON.stringify(response), "EX", 60);
    return res.status(200).json(response);
  }

  static async DetailPaiement(req, res) {
    const id_paiement = parseInt(req.params.id_paiement);

    if (isNaN(id_paiement)) {
      return res.status(400).json({ error: "id_paiement invalide" });
    }

    const paiement = await prisma.paiement.findUnique({
      where: { id_paiement },
      select: {
        montant: true,
        date_paiement: true,
        mode_paiement: true,
        reference_transaction: true,
        statut_paiement: true,
        inscription: {
          select: {
            date_inscription: true,
            statut_inscription: true,
            concours: {
              select: {
                annee: true,
                type: true,
                nombre_postes: true,
                nom: true,
              },
            },
            candidat: {
              select: {
                nom: true,
                prenom: true,
                numero_cnib: true,
                date_naissance: true,
              },
            },
          },
        },
      },
    });

    if (!paiement) {
      return res.status(404).json({ error: "Aucun paiement trouvé" });
    }

    return res.status(200).json({ data: paiement });
  }

  static async UpdatePaiementStatus(req, res) {
    const id_paiement = parseInt(req.params.id_paiement);
    const { id_candidat, statut_paiement } = req.body;

    if (isNaN(id_paiement)) {
      return res.status(400).json({ error: "id_paiement invalide" });
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
        statut_paiement: statut_paiement ?? paiement.statut_paiement,
      },
    });

    return res
      .status(200)
      .json({ message: "Statut du paiement modifié avec succès" });
  }

  static async CreateCategorie(req, res) {
    const { libelle } = req.body;

    const libelles = (Array.isArray(libelle) ? libelle : libelle.split(","))
      .map((l) => l.trim())
      .filter(Boolean);

    const categoriesExistantes = await prisma.categorieConcours.findMany({
      where: {
        libelle: { in: libelles, mode: "insensitive" },
      },
      select: { libelle: true },
    });

    if (categoriesExistantes.length > 0) {
      const doublons = categoriesExistantes.map((c) => c.libelle).join(", ");
      return res
        .status(409)
        .json({ message: `Doublons trouvés : ${doublons}` });
    }

    await prisma.categorieConcours.createMany({
      data: libelles.map((l) => ({ libelle: l })),
      skipDuplicates: true,
    });

    await invaliderCache("categorieConcours");

    return res
      .status(201)
      .json({ message: "Catégorie(s) de concours créée(s) avec succès" });
  }

  static async GetCategorie(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const cacheKey = `categorie:page:${page}:limit:${limit}`;
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
      page,
      limit,
      total,
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

    const cacheKey = `categorieConcours:${page}:limit:${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const [categories, total] = await Promise.all([
      prisma.categorieConcours.findMany({
        take: limit,
        skip,
        orderBy: { createdDate: "desc" },
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
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: categories,
    };

    await redis.set(cacheKey, JSON.stringify(response), "EX", 60);
    return res.status(200).json(response);
  }

  static async UpdateCategorieConcours(req, res) {
    const { id_categorie, libelle, description } = req.body;

    const categorie = await prisma.categorieConcours.findUnique({
      where: { id: id_categorie },
    });

    if (!categorie) {
      return res.status(404).json({ error: "Aucune catégorie trouvée" });
    }

    await prisma.categorieConcours.update({
      where: { id: id_categorie },
      data: {
        libelle: libelle ?? categorie.libelle,
        description: description ?? categorie.description,
        lastModifiedBy: req.admin.id_admin,
        lastModifiedDate: new Date(),
      },
    });

    await invaliderCache("categorie");
    await invaliderCache("categorieConcours");

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

    await invaliderCache("categorie");
    await invaliderCache("categorieConcours");

    return res.status(200).json({ message: "Catégorie supprimée avec succès" });
  }

  static async CreateExamen(req, res) {
    const {
      intitule,
      type_examen,
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

    const concours = await prisma.concours.findUnique({
      where: { id_concours: concoursId },
    });

    if (!concours) {
      return res.status(404).json({ error: "Concours introuvable" });
    }

    const examen = await prisma.examen.create({
      data: {
        intitule,
        type_examen,
        coefficient,
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

    await prisma.examen.delete({ where: { id_examen } });

    return res.status(200).json({ message: "Examen supprimé avec succès" });
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

  static async InscrireCandidат(req, res) {
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
        id_inscription: id_inscription,
      },
    });

    if (!inscription) {
      return res
        .status(404)
        .json({ error: "Aucune inscriptions trouvees. Veuillez reessayer" });
    }

    const updateTransaction = await prisma.$transaction(async (tx) => {
      const updateInsc = tx.inscription.update({
        where: {
          id_inscription,
        },
        data: {
          statut_inscription: status_inscriptions,
        },
      });

      return updateInsc;
    });

    return res.status(200).json({ message: "modification du status reussu" });
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

    const centre = await prisma.centre.findUnique({
      where: {
        id_centre,
      },
    });

    if (!centre) {
      return res.status(404).json({ error: "aucun centre trouver" });
    }

    // trouver le concours et les centres disponibles

    const inscription = await prisma.inscription.findUnique({
      where: {
        id_inscription,
      },
      select: {
        id_concours: true,
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

    isValidCentre = concours.centres.some((r) => r.centre.nom === centre.nom);
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
          id_centre: id_centre,
        },
      });

      return updateInsc;
    });
    return res.status(200).json({ message: "Modification du centre reussi" });
  }

  static async UploadsExamresponse() {
    const { id_examen } = req.body;
    const files = req.files;

    if (!id_examen) {
      return res
        .status(400)
        .json({ error: "les references de l'examen sont erronnes" });
    }
    if (!files || files.length === 0) {
      return res
        .status(400)
        .json({ error: "aucun fichier uploader veuillez inserer le document" });
    }

    // proceder a l'upload des fichiers
  }
}