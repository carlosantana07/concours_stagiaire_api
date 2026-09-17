import connection from "../config/redis.js";
import { prisma } from "../prisma.js";
import { generateReceipt } from "../services/Upload-file.service.js";
import AzureBlob from "../services/Azure.blob.service.js";
const redis = connection;
export class InscriptionController {
  static async sInscrire(req, res) {
    const { id_candidat } = req.user;
    const id_concours = parseInt(req.body.id_concours);
    const id_centre = parseInt(req.body.id_centre);

    // console.log({
    //   centre: id_centre,
    //   concours: id_concours,
    //   candidat: id_candidat,
    // });

    if (!id_candidat) {
      return res.status(401).json({ error: "Non autorisé" });
    }

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
    const dateDebut = new Date(concours.date_debut);
    const dateFin = new Date(concours.date_fin);

    aujourd_hui.setHours(0, 0, 0, 0);
    dateDebut.setHours(0, 0, 0, 0);
    dateFin.setHours(0, 0, 0, 0);

    // if (aujourd_hui < dateDebut || aujourd_hui > dateFin) {
    //   return res.status(400).json({
    //     error: "La période d'inscription est fermée",
    //   });
    // }

    if (aujourd_hui > dateFin) {
      return res.status(400).json({
        error: "La période d'inscription est fermée",
      });
    }

    // console.log('apres auj')
    const centreValide = await prisma.ConcoursCentre.findFirst({
      where: { concoursId: id_concours, centreId: id_centre },
    });

    if (!centreValide) {
      return res.status(400).json({
        error: "Ce centre n'est pas disponible pour ce concours",
      });
    }
    // verifer des cases
    // console.log('centre valide ', centreValide)
    // console.log('canidadat ', id_candidat)
    const cand = await prisma.candidat.findFirst({
      where: { id_candidat: id_candidat },
    });

    // console.log ('trouver le candidat ', cand)
    if (cand && cand.matricule && concours.type !== "PROFESSIONNEL") {
      // logger pour dire que

      console.log(
        `Le candidat ${id_candidat} est deja dans la fonction publique`,
      );
      return res.status(409).json({
        error: "Vous n'etes pas autoriser a passer un autre concours.",
      });
    }
    const listEligPro = ["PROFESSIONNEL", "HANDICAPE"];

    if (cand.type_candidat === "PROFESSIONNEL" && !listEligPro[concours.type]) {
      return res
        .status(403)
        .json({ error: "Vous n'avez pas acces a cet concours" });
    }

    const listEligDirect = ["DIRECT", "HANDICAPE"];

    if (cand.type_candidat === "DIRECT" && !listEligDirect[concours.type]) {
      return res
        .status(403)
        .json({ error: "Vous n'avez pas access a cet concours" });
    }

    const dejaInscrit = await prisma.inscription.findFirst({
      where: { id_candidat: id_candidat, id_concours: id_concours },
    });

    //  console.debug ('deja inscrit ', dejaInscrit)

    if (dejaInscrit) {
      const messageStatut =
        dejaInscrit.statut_inscription === "VALIDEE"
          ? "Vous êtes déjà inscrit  a ce concours ."
          : "Vous etes deja inscit(e) a ce concours et est  en attente de paiement";

      return res.status(409).json({
        error: messageStatut,
        id_inscription: dejaInscrit.id_inscription,
      });
    }

    // uploader le diplome ici en mm temps

    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Aucun fichier reçu" });
    }
    const fileBuffers = files.map((file) => ({
      buffer: file.buffer,
      originalName: file.originalname,
      mimetype: file.mimetype,
    }));
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
        concours: {
          select: { nom: true, frais_inscription: true },
        },
        centre: {
          select: { nom: true },
        },
      },
    });

    if (!inscription) {
      return res
        .status(500)
        .json({ error: "Échec de la création de l'inscription" });
    }

    try {
      const documents = await prisma.$transaction(async (tx) => {
        const created = [];
        for (let i = 0; i < uploadResult.resp.length; i++) {
          const blobInfo = uploadResult.resp[i];

          // console.log(blobInfo);

          const doc = await tx.diplome.create({
            data: {
              fichier: blobInfo.nom,
              url: blobInfo.url,
              req_id: blobInfo.requestId,
              date_upload: new Date(),
              id_inscription: inscription.id_inscription,
            },
          });

          // console.log(doc)
          created.push(doc);
        }
        return created;
      });

      console.log("documents", documents);

      const cacheKey = `InscriptionAll`;

      await redis.del(cacheKey);
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
    } catch (dbError) {
      // En cas d'échec de l'insertion, on pourrait envisager de supprimer les blobs déjà créés
      // (nettoyage), mais ce n'est pas obligatoire selon votre logique métier.
      return res.status(500).json({
        error: "Erreur lors de l'enregistrement en base",
        details: dbError.message,
      });
    }
  }

  static async getInscription(req, res) {
    const { id_candidat } = req.user;
    const id_inscription = parseInt(req.params.id_inscription);

    if (!id_candidat) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    if (isNaN(id_inscription)) {
      return res.status(400).json({ error: "id_inscription invalide" });
    }

    const inscription = await prisma.inscription.findFirst({
      where: { id_inscription, id_candidat },
      select: {
        id_inscription: true,
        date_inscription: true,
        statut_inscription: true,
        concours: {
          select: {
            nom: true,
            type: true,
            frais_inscription: true,
            date_debut: true,
            date_fin: true,
          },
        },
        centre: {
          select: { nom: true },
        },
        paiement: {
          select: {
            statut_paiement: true,
            mode_paiement: true,
            montant: true,
            reference_transaction: true,
            date_paiement: true,
          },
          orderBy: { date_paiement: "desc" },
          take: 1,
        },
      },
    });

    if (!inscription) {
      return res.status(404).json({ error: "Inscription introuvable" });
    }

    const paiement = inscription.paiement[0] ?? null;

    return res.status(200).json({
      message: "Inscription récupérée",
      data: {
        id_inscription: inscription.id_inscription,
        date_inscription: inscription.date_inscription,
        statut_inscription: inscription.statut_inscription,
        concours: inscription.concours,
        centre: inscription.centre,
        paiement,
        recepisse_disponible: paiement?.statut_paiement === "REUSSI",
      },
    });
  }
}
