import { prisma } from "../prisma.js";
import { connection as redis } from "../config/redis.js";
;
export class ConcoursController {


  static async GetCategorie(req, res) {
    try {
      const page = parseInt(req.params.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      const cacheKey = `categorie:page:${page}:limit:${limit}`;

      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(" Cache hit pour categorie");
        return res.status(200).json(JSON.parse(cached));
      }

      console.log("Cache miss pour categorie DB call");

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
        return res.status(404).json({ message: "Aucune categorie trouvee" });
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
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "une erreur est survenue" });
    }
  }

static async GetAllConcours(req, res) {
  try {

    const concours = await prisma.concours.findMany({

      where: {
        statut_concours: "OUVERT",
      },

      orderBy: {
        date_debut: "desc",
      },

      select: {
        id_concours: true,
        nom: true,
        type: true,
        description: true,
        frais_inscription: true,
        nombre_postes: true,
        annee: true,
        statut_concours: true,
        date_debut: true,
        date_fin: true,

        _count: {
          select: {
            inscription: true,
          },
        },

        categorie: {
          select: {
            id: true,
            libelle: true,
            description: true,
          },
        },
      },
    });

    console.log(concours);

    return res.status(200).json({
      ok: true,
      data: concours,
    });

  } catch (err) {

    console.error("Une erreur est survenue:", err);

    return res.status(500).json({
      error: "Impossible de récupérer les concours.",
    });
  }
}

static async DetailConcours(req, res) {
  try {
    const id_concours = parseInt(req.params.id);
    const cacheKey = `concours:detail:${id_concours}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      // console.log("Cache hit pour concours detail");
      return res.status(200).json(JSON.parse(cached));
    }

    const concours = await prisma.concours.findUnique({
      where: { id_concours ,
     
      },

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
        _count: {
          select: { inscription: true },
        },
        centres: {
          select: {
            centre: {
              select: {
                nom: true,
                id_centre: true,
              },
            },
          },
        },
        categorie: {
          select: {
            id: true,
            libelle: true,
            description: true,
          },
        },
      },
    });


    if (!concours) {
      return res.status(404).json({ error: "Aucun concours trouvé" });
    }

    // parser les dates et affficher en heures francaises

    concours.date_debut = concours.date_debut.toLocaleDateString('fr-FR')
    concours.date_fin = concours.date_fin.toLocaleDateString('fr-FR');
    
    const response = { data: concours };


    await redis.set(cacheKey, JSON.stringify(response), "EX", 500);

    return res.status(200).json(response);
  } catch (err) {
    console.log("Une erreur est survenue", err);
    return res.status(500).json({ error: "Une erreur est survenue" });
  }
}

static async GetCategorieConcours(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      const cacheKey = `categorieConcours:${page}:limit:${limit}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        // console.log('cache recuperer',cached)
        return res.status(200).json(JSON.parse(cached));

      }

      const [concours, total] = await Promise.all([
        await prisma.categorieConcours.findMany({
          take: limit,
          skip,
          orderBy: { createdDate: "desc" },
          select: {
            id: true,
            libelle: true,
            concours: {
              select: {
                id_concours: true,
                nom: true,
              },
            },
          },
        }),
        await prisma.categorieConcours.count(),
      ]);

      if (!concours) {
        return res.status(404).json({ error: "aucun concours trouver" });
      }

      const response = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        data: concours,
      };

      await redis.set(cacheKey, JSON.stringify(response), "EX", 60);
      return res.status(200).json(response);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "une erreur est survenue" });
    }
  }

  
}