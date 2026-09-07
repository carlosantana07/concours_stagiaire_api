import { prisma } from "../prisma.js";
import bcrypt from "bcrypt";
import { uploadToMinio } from "../services/Upload-file.service.js";
import { generateReceipt } from "../services/Upload-file.service.js";
import AzureBlob from "../services/Azure.blob.service.js";
import pkg from "../generated/prisma/index.js";
import connection from "../config/redis.js";
// const { TypeDocument } = pkg;

const redis = connection;
export class CandidatController {
  // constructor (){

  // }

  static async getProfil(req, res) {
    const { id_candidat } = req.user;

    if (!id_candidat) {
      return res.status(401).json({ error: "Id_candidat invalide" });
    }

    const candidat = await prisma.candidat.findUnique({
      where: { id_candidat },
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
        recepisse: true,
        date_creation: true,
        document: {
          select: {
            type_document: true,
            fichier: true,
            url: true,
            date_upload: true,
          },
        },
      },
    });

    candidat.date_naissance =
      candidat.date_naissance.toLocaleDateString("fr-FR");
    const status = candidat.statut_compte === "ACTIF";

    if (!candidat) {
      return res.status(404).json({ error: "Candidat introuvable" });
    }

    return res.status(200).json({
      data: candidat,
      status: status,
    });
  }

  static async updateProfil(req, res) {
    const { id_candidat } = req.user;
    const {
      telephone,
      email,
      nom_jeune_fille,
      ancien_mot_de_passe,
      nouveau_mot_de_passe,
      emploi,
      ministere,
      matricule,
    } = req.body;

    if (!id_candidat) {
      return res.status(401).json({ error: "Id_candidat invalide" });
    }

    const candidat = await prisma.candidat.findUnique({
      where: { id_candidat },
    });

    if (!candidat) {
      return res.status(404).json({ error: "Candidat introuvable" });
    }

    const dataToUpdate = {};
    if (telephone) dataToUpdate.telephone = telephone;
    if (email) dataToUpdate.email = email;
    if (nom_jeune_fille) dataToUpdate.nom_jeune_fille = nom_jeune_fille;
    if (emploi) dataToUpdate.emploi = emploi;
    if (ministere) dataToUpdate.ministere = ministere;
    if (matricule) dataToUpdate.matricule = matricule;

    if (nouveau_mot_de_passe) {
      if (!ancien_mot_de_passe) {
        return res.status(400).json({
          error: "L'ancien mot de passe est requis pour le modifier",
        });
      }

      const correct = await bcrypt.compare(
        ancien_mot_de_passe,
        candidat.mot_de_passe,
      );

      if (!correct) {
        return res.status(401).json({
          error: "Ancien mot de passe incorrect",
        });
      }

      dataToUpdate.mot_de_passe = await bcrypt.hash(nouveau_mot_de_passe, 10);
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({
        error: "Aucune donnée à mettre à jour",
      });
    }

    const updated = await prisma.candidat.update({
      where: { id_candidat },
      data: dataToUpdate,
      select: {
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        lieu_naissance: true,
        nom_jeune_fille: true,
        emploi: true,
        matricule: true,
        ministere: true,
      },
    });

    if (!updated) {
      return res.status(500).json({ error: "Échec de la mise à jour" });
    }

    return res.status(200).json({
      message: "Profil mis à jour",
      data: updated,
    });
  }

  static async getMesCandidatures(req, res) {
    const { id_candidat } = req.user;
    const limit = 5;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    if (!id_candidat) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    const [inscriptions, total] = await Promise.all([
      prisma.inscription.findMany({
        take: limit,
        skip,
        where: { id_candidat, delete_at: null },
        include: {
          concours: {
            select: {
              id_concours: true,
              nom: true,
              type: true,
              statut_concours: true,
              frais_inscription: true,
              date_debut: true,
              date_fin: true,
            },
          },
          paiement: {
            select: {
              statut_paiement: true,
              reference_transaction: true,
              montant: true,
              mode_paiement: true,
            },
            orderBy: { date_paiement: "desc" },
            take: 1,
          },
          centre: {
            select: { nom: true },
          },
        },
        orderBy: { date_inscription: "desc" },
      }),
      prisma.inscription.count({
        where: { id_candidat },
      }),
    ]);

    if (inscriptions.length === 0) {
      return res.status(200).json({
        message: "Aucune candidature trouvée",
        data: [],
        page,
        total: 0,
        pageTot: 0,
      });
    }

    const data = inscriptions.map((insc) => {
      const paiement = insc.paiement[0] ?? null;
      return {
        id_inscription: insc.id_inscription,
        date_inscription: insc.date_inscription,
        statut_inscription: insc.statut_inscription,
        concours: insc.concours,
        centre: insc.centre,
        paiement,
        recepisse_disponible: paiement?.statut_paiement === "REUSSI",
      };
    });

    return res.status(200).json({
      data,
      page,
      total,
      pageTot: Math.ceil(total / limit),
    });
  }

  // static async getResultats(req, res) {
  //   const { id_candidat } = req.user;

  //   if (!id_candidat) {
  //     return res.status(401).json({ error: "Id_candidat invalide" });
  //   }

  //   const resultats = await prisma.resultat.findMany({
  //     where: { id_candidat },
  //     include: {
  //       examen: {
  //         select: {
  //           intitule: true,
  //           date_examen: true,
  //           lieu: true,
  //           type_examen: true,
  //           coefficient: true,
  //           concours: {
  //             select: { nom: true, type: true },
  //           },
  //         },
  //       },
  //     },
  //   });

  //   if (!resultats || resultats.length === 0) {
  //     return res.status(200).json({
  //       message: "Aucun résultat disponible pour le moment",
  //       data: [],
  //     });
  //   }

  //   const parConcours = resultats.reduce((acc, r) => {
  //     const nomConcours = r.examen.concours.nom;
  //     if (!acc[nomConcours]) {
  //       acc[nomConcours] = {
  //         concours: r.examen.concours,
  //         examens: [],
  //       };
  //     }
  //     acc[nomConcours].examens.push({
  //       intitule: r.examen.intitule,
  //       type_examen: r.examen.type_examen,
  //       date_examen: r.examen.date_examen,
  //       lieu: r.examen.lieu,
  //       coefficient: r.examen.coefficient,
  //       note: r.note,
  //       moyenne_generale: r.moyenne_generale,
  //       statut: r.statut,
  //     });
  //     return acc;
  //   }, {});

  //   return res.status(200).json({
  //     data: Object.values(parConcours),
  //   });
  // }

  static async getRecepisse(req, res) {
    const { id_candidat } = req.user;
    const id_inscription = parseInt(req.body.id_inscription);

    if (!id_candidat) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    if (!id_inscription || isNaN(id_inscription)) {
      return res.status(400).json({ error: "id_inscription invalide" });
    }

    const inscription = await prisma.inscription.findFirst({
      where: { id_inscription, id_candidat },
      select: {
        id_inscription: true,
        statut_inscription: true,
        candidat: {
          select: {
            nom: true,
            prenom: true,
            date_naissance: true,
            lieu_naissance: true,
            sexe: true,
            numero_cnib: true,
            telephone: true,
            email: true,
          },
        },
        concours: {
          select: {
            id_concours: true,
            nom: true,
          },
        },
        centre: {
          select: { nom: true },
        },
      },
    });

    if (!inscription) {
      return res.status(404).json({ error: "Inscription introuvable" });
    }

    if (inscription.statut_inscription !== "VALIDEE") {
      return res.status(400).json({
        error: "Effectuez le paiement avant de télécharger le récépissé",
      });
    }

    const numero_recepisse = `CONC-${inscription.concours.id_concours}-${inscription.candidat.sexe === "FEMME" ? "F" : "H"}-${inscription.id_inscription}`;

    const data = {
      centre: inscription.centre.nom,
      concours: inscription.concours.nom,
      nom: inscription.candidat.nom,
      prenom: inscription.candidat.prenom,
      date_naissance: new Date(
        inscription.candidat.date_naissance,
      ).toLocaleDateString("fr-FR"),
      lieu_naissance: inscription.candidat.lieu_naissance,
      sexe: inscription.candidat.sexe,
      cnib: inscription.candidat.numero_cnib,
      telephone: inscription.candidat.telephone,
      email: inscription.candidat.email,
      concoursID: inscription.concours.id_concours,
      numero_dossier: numero_recepisse,
      date_inscription: new Date().toLocaleDateString("fr-FR"),
      qr: JSON.stringify({
        centre: inscription.centre.nom,
        nom: inscription.candidat.nom,
        prenom: inscription.candidat.prenom,
        concoursID: inscription.concours.id_concours,
      }),
    };

    await generateReceipt(data, res);
  }

  // ca ces minio ....

  static async uploadDocuments(req, res) {
    const { id_candidat } = req.user;

    if (!id_candidat) {
      return res.status(401).json({ error: "Id_candidat invalide" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Aucun fichier fourni" });
    }

    const types = Array.isArray(req.body.type_document)
      ? req.body.type_document
      : [req.body.type_document];

    if (!types || types.length === 0) {
      return res.status(400).json({ error: "type_document est requis" });
    }

    if (types.length !== req.files.length) {
      return res.status(400).json({
        error: `Le nombre de types (${types.length}) ne correspond pas au nombre de fichiers (${req.files.length})`,
      });
    }

    const typesValides = Object.values(TypeDocument);
    const typesInvalides = types.filter((t) => !typesValides.includes(t));

    if (typesInvalides.length > 0) {
      return res.status(400).json({
        error: "Types de documents invalides",
        types_invalides: typesInvalides,
        valeurs_acceptees: typesValides,
      });
    }

    const mimeValides = ["application/pdf", "image/jpeg", "image/png"];
    const uploadedDocs = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const type_document = types[i];

      if (!mimeValides.includes(file.mimetype)) {
        return res.status(400).json({
          error: `Type de fichier non accepté : ${file.mimetype}. Acceptés : PDF, JPG, PNG`,
        });
      }

      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          error: "Fichier trop volumineux. Maximum 5 Mo par fichier",
        });
      }

      const objectName = `candidats/${id_candidat}/${type_document}-${Date.now()}.pdf`;

      const uploadOk = await uploadToMinio(
        process.env.MINIO_BUCKET,
        objectName,
        file.buffer,
        file.mimetype,
      );

      if (!uploadOk) {
        return res.status(503).json({
          error: `Erreur lors de l'upload du fichier ${type_document}`,
        });
      }

      const doc = await prisma.document.create({
        data: {
          id_candidat,
          type_document,
          fichier: objectName,
          date_upload: new Date(),
        },
      });

      if (!doc) {
        return res.status(500).json({
          error: `Erreur lors de l'enregistrement du document ${type_document}`,
        });
      }

      uploadedDocs.push(doc);
    }

    return res.status(201).json({
      message: `${uploadedDocs.length} fichier(s) uploadé(s) avec succès`,
      documents: uploadedDocs,
    });
  }

  static async uploadDocumentsAzure(req, res) {
    const { id_candidat } = req.user;
    const { type_document } = req.body;
    const cacheKey = "document";
    // console.log("id utilisateur ", id_candidat);
    if (!id_candidat || !type_document) {
      return res.status(400).json({
        error: "le type de document requis ou une autre erreur est survene ",
      });
    }

    // voir dabord si les deux type de document

    // verfier s'il a deja des dcouments comme cnib

    const exist = await prisma.document.findMany({
      where: {
        id_candidat: id_candidat,
        type_document: {
          in: ["CNIB", "PASSPORT", "NATIONALITE"],
        },
      },
    });

    if (exist && exist.length >= 2) {
      return res.status(409).json({
        error: "Vous ne pouvez plus inserer d'image sauf pour modification",
      });
    }

    // verifiers si il n'a pas upload plusieurs fois cnib ou nationalite

    const existType = await prisma.document.findFirst({
      where: {
        id_candidat: id_candidat,
      },
      select: {
        type_document: true,
      },
    });

    if (
      existType?.type_document.toLowerCase() === type_document.toLowerCase()
    ) {
      return res.status(409).json({
        error: "Vous avez deja inserer ce document en base de donnees",
      });
    }

    if (
      type_document.toLowerCase() === "cnib" ||
      ("passport" && existType.type_document.toLocaleLowerCase === "cnib") ||
      "passport"
    ) {
      return res
        .status(409)
        .json({ error: "Vous devez inserer votre certificat de nationalite" });
    }
    const typesValides = ["CNIB", "PASSPORT", "NATIONALITE"];
    if (!typesValides.includes(type_document.toUpperCase())) {
      return res.status(400).json({
        error: "Type de document invalide. Utilisez CNIB ou PASSPORT",
      });
    }

    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Aucun fichier reçu" });
    }

    // Préparer les données pour l'upload Azure
    const fileBuffers = files.map((file) => ({
      buffer: file.buffer,
      originalName: file.originalname,
      mimetype: file.mimetype,
    }));

    // Initialiser AzureBlob
    const azure = new AzureBlob();
    const initResult = await azure.init();
    if (!initResult.success) {
      return res.status(500).json({
        error: "Erreur de connexion Azure",
        details: initResult.error,
      });
    }

    let uploadResult;
    try {
      uploadResult = await azure.Uploads(fileBuffers);
    } catch (error) {
      return res.status(500).json({
        error: "Erreur lors de l'upload Azure",
        details: error.message,
      });
    }

    if (!uploadResult.success) {
      return res
        .status(500)
        .json({ error: "Échec de l'upload", details: uploadResult.message });
    }

    // Insérer chaque document dans la base de données (transaction)
    try {
      const documents = await prisma.$transaction(async (tx) => {
        const created = [];
        for (let i = 0; i < uploadResult.resp.length; i++) {
          const blobInfo = uploadResult.resp[i];

          // console.log(blobInfo);

          const doc = await tx.document.create({
            data: {
              id_candidat,
              type_document: type_document.toUpperCase(),
              fichier: blobInfo.nom,
              url: blobInfo.url,
              req_id: blobInfo.requestId,
              date_upload: new Date(),
            },
          });

          // console.log(doc)
          created.push(doc);
        }
        return created;
      });

      console.log("documents", documents);

      await redis.del(cacheKey);
      return res.status(201).json({
        success: true,
        message: `${documents.length} document(s) uploadé(s) avec succès`,
        documents,
      });
    } catch (dbError) {
      // En cas d'échec de l'insertion, on pourrait envisager de supprimer les blobs déjà créés
      // (nettoyage), mais ce n'est pas obligatoire selon votre logique métier.
      return res.status(500).json({
        error: "Erreur lors de l'enregistrement en base",
        details: dbError.message,
      });
    }
  }

  static async updateDocumentAzure(req, res) {
    const { blobName } = req.params;
    const cacheKey = "document";
    const file = req.file;

    if (!blobName) {
      return res.status(400).json({ error: "Nom du blob manquant" });
    }
    if (!file) {
      candidat_id;
      return res
        .status(400)
        .json({ error: "Aucun fichier fourni pour la mise à jour" });
    }

    // Vérifier que le document existe en base (optionnel mais recommandé)
    const existingDoc = await prisma.document.findFirst({
      where: { fichier: blobName },
    });
    if (!existingDoc) {
      return res.status(404).json({ error: "Document introuvable en base" });
    }

    const azure = new AzureBlob();
    const initResult = await azure.init();
    if (!initResult.success) {
      return res.status(500).json({
        error: "Erreur de connexion Azure",
        details: initResult.error,
      });
    }

    const updateResult = await azure.Update(blobName, { buffer: file.buffer });
    if (!updateResult.success) {
      return res.status(500).json({
        error: "Échec de la mise à jour",
        details: updateResult.message,
      });
    }

    // Mettre à jour la date dans la base (facultatif)
    await prisma.document.update({
      where: { id: existingDoc.id, id_candidat },
      data: { date_upload: new Date() },
    });

    await redis.del(cacheKey);
    return res.status(200).json({
      success: true,
      message: "Document mis à jour avec succès",
      document: {
        nom: blobName,
        url: updateResult.resp?.url,
        requestId: updateResult.resp?.requestId,
      },
    });
  }

  static async deleteDocumentAzure(req, res) {
    const { blobName } = req.params;
    const { id_candidat } = req.user;

    const cacheKey = "document";

    if (!blobName) {
      return res.status(400).json({ error: "Nom du blob manquant" });
    }

    // Vérifier l'existence en base
    const existingDoc = await prisma.document.findFirst({
      where: { fichier: blobName, id_candidat },
    });
    if (!existingDoc) {
      return res.status(404).json({ error: "Document introuvable en base" });
    }

    const azure = new AzureBlob();
    const initResult = await azure.init();
    if (!initResult.success) {
      return res.status(500).json({
        error: "Erreur de connexion Azure",
        details: initResult.error,
      });
    }

    const deleteResult = await azure.Delete(blobName);
    if (!deleteResult.success) {
      return res.status(500).json({
        error: "Échec de la suppression",
        details: deleteResult.message,
      });
    }

    // Supprimer l'entrée en base
    await prisma.document.delete({
      where: { id: existingDoc.id, id_candidat },
    });

    await redis.del(cacheKey);

    return res.status(200).json({
      success: true,
      message: "Document supprimé avec succès",
      deleted: blobName,
    });
  }

  static async mesDocuments(req, res) {
    const { id_candidat } = req.user;

    const cacheKey = "document";
    const docs = await redis.get(cacheKey);
    if (docs?.length > 0) {
      return res.status(200).json({ data: docs });
    }
    const document = await prisma.document.findMany({
      where: {
        id_candidat: id_candidat,
      },
      select: {
        url: true,
        type_document: true,
      },
    });

    await redis.set(cacheKey, JSON.stringify(document), "EX", 300);

    return res.status(200).json({ data: document });
  }

  static async getResultats(req, res) {
    const { id_candidat } = req.user;

    // if (!id_candidat) {
    //   return res.status(401).json({ Error: "Veuillez vous connecter" });
    // }
    // recuperer les ids des inscriptions resussi

    const idsIncre = await prisma.inscription.findMany({
      where: {
        id_candidat,
        // delete_at: null,
        // statut_inscription: "VALIDEE",
      },
      select: {
        id_concours: true,
      },
    });

    const ids = idsIncre.map((f) => parseInt(f.id_concours));

    
    // verfier que ses inscriptions ont des paiements ....

    // const paiement = await prisma.paiement.findMany({
    //   where:{
    //     id_inscription:{
    //       in: idsIncre
    //     },
    //     statut_paiement:'REUSSI'
    //   }
    // });

    // if(paiement.length !== idsIncre.length){

    // }

    const marge = 60;

    const resultat = await prisma.resultat.findMany({
      where: {
        id_concours: {
          in: ids,
        },
      },
      select: {
        note_cg: true,
        note_sp: true,
        // moyenne_generale: true,
        statut: true,

        concours: {
          select: {
            id_concours: true,
            nom: true,
          },
        },
        examen: {
          select: {
            id_concours: true,
            intitule: true,
          },
        },
      },
    });

    // ajouter la moyenne

    const rs = resultat.map((r) => ({
      ...r,
      moyenne: r.note_sp * (marge / 100) + r.note_cg * ((100 - marge) / 100),
    }));

    // calculer les rangs

    return res.status(200).json(rs);
  }
}
