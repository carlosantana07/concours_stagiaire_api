import { prisma }          from "../prisma.js";
import { generateReceipt } from "../services/Upload-file.service.js";

export class InscriptionController {


  static async sInscrire(req, res) {
    const { id_candidat } = req.user;
    const id_concours     = parseInt(req.body.id_concours);
    const id_centre       = parseInt(req.body.id_centre);

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
    const dateDebut   = new Date(concours.date_debut);
    const dateFin     = new Date(concours.date_fin);

    aujourd_hui.setHours(0, 0, 0, 0);
    dateDebut.setHours(0, 0, 0, 0);
    dateFin.setHours(0, 0, 0, 0);

    if (aujourd_hui < dateDebut || aujourd_hui > dateFin) {
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
      const messageStatut = dejaInscrit.statut_inscription === "VALIDEE"
        ? "Vous êtes déjà inscrit et votre paiement est validé"
        : "Vous avez déjà une inscription en attente de paiement";

      return res.status(409).json({
        error:          messageStatut,
        id_inscription: dejaInscrit.id_inscription,
      });
    }

    const inscription = await prisma.inscription.create({
      data: {
        statut_inscription: "EN_ATTENTE",
        candidat: { connect: { id_candidat } },
        concours: { connect: { id_concours } },
        centre:   { connect: { id_centre } },
      },
      select: {
        id_inscription:     true,
        date_inscription:   true,
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
      return res.status(500).json({ error: "Échec de la création de l'inscription" });
    }

    return res.status(201).json({
      message: "Inscription créée — en attente de paiement",
      data: {
        id_inscription:     inscription.id_inscription,
        date_inscription:   inscription.date_inscription,
        statut_inscription: inscription.statut_inscription,
        concours:           inscription.concours,
        centre:             inscription.centre,
        prochaine_etape:    "Effectuez le paiement pour confirmer votre dossier",
      },
    });
  }


  static async getInscription(req, res) {
    const { id_candidat } = req.user;
    const id_inscription  = parseInt(req.params.id_inscription);

    if (!id_candidat) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    if (isNaN(id_inscription)) {
      return res.status(400).json({ error: "id_inscription invalide" });
    }

    const inscription = await prisma.inscription.findFirst({
      where: { id_inscription, id_candidat },
      select: {
        id_inscription:     true,
        date_inscription:   true,
        statut_inscription: true,
        concours: {
          select: {
            nom:               true,
            type:              true,
            frais_inscription: true,
            date_debut:        true,
            date_fin:          true,
          },
        },
        centre: {
          select: { nom: true },
        },
        paiement: {
          select: {
            statut_paiement:       true,
            mode_paiement:         true,
            montant:               true,
            reference_transaction: true,
            date_paiement:         true,
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
        id_inscription:      inscription.id_inscription,
        date_inscription:    inscription.date_inscription,
        statut_inscription:  inscription.statut_inscription,
        concours:            inscription.concours,
        centre:              inscription.centre,
        paiement,
        recepisse_disponible: paiement?.statut_paiement === "REUSSI",
      },
    });
  }
}