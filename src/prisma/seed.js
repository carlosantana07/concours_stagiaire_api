import { PrismaClient } from '../generated/prisma/index.js';
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const NOMS = [
  "Ouédraogo","Sawadogo","Kaboré","Traoré","Zongo","Compaoré","Tapsoba",
  "Nikiéma","Yameogo","Belem","Sankara","Diallo","Coulibaly","Konaté",
  "Some","Barro","Dao","Soulama","Tiendrebeogo","Ilboudo",
];

const PRENOMS_H = [
  "Issouf","Dramane","Adama","Moussa","Ibrahim","Hamidou","Souleymane",
  "Boureima","Seydou","Abdoulaye","Salif","Mamadou","Yacouba","Noufou",
];

const PRENOMS_F = [
  "Aminata","Mariam","Fatoumata","Rasmata","Aïcha","Salamata","Bintou",
  "Assita","Nafissatou","Djamila","Maimouna","Kadiatou","Rokiatou","Fanta",
];

const LIEUX_NAISSANCE = [
  "Ouagadougou","Bobo-Dioulasso","Koudougou","Banfora","Ouahigouya",
  "Dédougou","Fada N'Gourma","Tenkodogo","Kaya","Ziniaré",
];

const rand    = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function genererDate(anneeMin, anneeMax) {
  const annee = randInt(anneeMin, anneeMax);
  const mois  = randInt(1, 12);
  const jour  = randInt(1, 28);
  return new Date(`${annee}-${String(mois).padStart(2,'0')}-${String(jour).padStart(2,'0')}`);
}

async function main() {
  console.log("🚀 Démarrage du seed...\n");

  // ── ADMIN ──────────────────────────────────────────────────
  let admin = await prisma.admin.findUnique({
    where: { email: "admin@econcours.gov.bf" },
  });
  if (!admin) {
    admin = await prisma.admin.create({
      data: {
        nom:          "Admin",
        prenom:       "Super",
        email:        "admin@econcours.gov.bf",
        mot_de_passe: await bcrypt.hash("Admin@1234", 10),
        telephone:    "70000000",
        role:         "SUPERADMIN",
        actif:        true,
      },
    });
  }
  console.log("✅ Admin prêt");

  // ── CENTRES ────────────────────────────────────────────────
  const centresData = [
    "Ouagadougou","Bobo-Dioulasso","Koudougou",
    "Banfora","Ouahigouya","Dédougou","Fada N'Gourma","Tenkodogo",
  ];
  const centres = [];
  for (const nom of centresData) {
    let c = await prisma.centre.findFirst({ where: { nom } });
    if (!c) c = await prisma.centre.create({ data: { nom } });
    centres.push(c);
  }
  console.log(`✅ ${centres.length} centres prêts`);

  // ── LIEUX DE COMPOSITION ───────────────────────────────────
  const lieuxData = [
    { nom: "Lycée Philippe Zinda Kaboré",  quota: 1500, id_centre: centres[0].id_centre },
    { nom: "Lycée Wemtenga",               quota: 1200, id_centre: centres[0].id_centre },
    { nom: "Lycée Technique de Ouaga",     quota: 1000, id_centre: centres[0].id_centre },
    { nom: "Lycée Ouézzin Coulibaly",      quota: 900,  id_centre: centres[1].id_centre },
    { nom: "Lycée Municipal de Bobo",      quota: 800,  id_centre: centres[1].id_centre },
    { nom: "Lycée Dim Dolobsom",           quota: 600,  id_centre: centres[2].id_centre },
    { nom: "CEG de Koudougou",             quota: 500,  id_centre: centres[2].id_centre },
    { nom: "Lycée de Banfora",             quota: 400,  id_centre: centres[3].id_centre },
    { nom: "Lycée de Ouahigouya",          quota: 400,  id_centre: centres[4].id_centre },
    { nom: "CEG de Dédougou",              quota: 300,  id_centre: centres[5].id_centre },
    { nom: "Lycée de Fada N'Gourma",       quota: 300,  id_centre: centres[6].id_centre },
    { nom: "CEG de Tenkodogo",             quota: 300,  id_centre: centres[7].id_centre },
  ];
  const lieux = [];
  for (const l of lieuxData) {
    let lieu = await prisma.lieuxComposition.findFirst({ where: { nom: l.nom } });
    if (!lieu) lieu = await prisma.lieuxComposition.create({ data: l });
    lieux.push(lieu);
  }
  console.log(`✅ ${lieux.length} lieux de composition prêts`);

  // ── CATEGORIES ─────────────────────────────────────────────
  const categoriesData = [
    { libelle: "Fonction Publique",  description: "Concours de la fonction publique" },
    { libelle: "Militaire",          description: "Concours des forces armées" },
    { libelle: "Paramédical",        description: "Concours du secteur de la santé" },
    { libelle: "Enseignement",       description: "Concours pour le corps enseignant" },
    { libelle: "Police Nationale",   description: "Concours de la police nationale" },
    { libelle: "Douanes",            description: "Concours des douanes" },
    { libelle: "Eaux et Forêts",     description: "Concours des eaux et forêts" },
    { libelle: "Justice",            description: "Concours du ministère de la justice" },
  ];
  const categories = [];
  for (const cat of categoriesData) {
    let cat_ = await prisma.categorieConcours.findFirst({ where: { libelle: cat.libelle } });
    if (!cat_) cat_ = await prisma.categorieConcours.create({ data: cat });
    categories.push(cat_);
  }
  console.log(`✅ ${categories.length} catégories prêtes`);

  // ── CONCOURS ───────────────────────────────────────────────
  const TYPES = ["DIRECT", "PROFESSIONNEL"];

const NOMS_CONCOURS = [
  "Agents de Santé", "Infirmiers d'État", "Sages-femmes",
  "Instituteurs Adjoints", "Professeurs Certifiés",
  "Inspecteurs des Impôts", "Agents des Douanes",
  "Sous-officiers Militaires", "Gardiens de la Paix",
  "Agents des Eaux et Forêts", "Greffiers", "Magistrats",
  "Techniciens Informatiques", "Secrétaires Administratifs",
  "Agents des Travaux Publics", "Contrôleurs du Trésor",
  "Agents de l'Agriculture", "Agents de l'Élevage",
  "Techniciens de Laboratoire", "Agents de la Protection Civile",
];

const concoursData = [];

for (let i = 0; i < 20; i++) {
  const categorie = rand(categories);
  const centresChoisis = centres
    .sort(() => 0.5 - Math.random())
    .slice(0, randInt(2, centres.length));

  const annee = randInt(2024, 2027);

  concoursData.push({
    nom: `${NOMS_CONCOURS[i]} ${annee}`,
    type: rand(TYPES),
    description: `Concours organisé par le ministère lié à ${categorie.libelle}.`,
    frais_inscription: randInt(2000, 10000),
    nombre_postes: randInt(50, 1000),
    annee,
    date_debut: genererDate(annee, annee),
    date_fin: genererDate(annee, annee),
    statut_concours: "OUVERT",
    categorieId: categorie.id,
    centreIds: centresChoisis.map(c => c.id_centre),
  });
}
const concoursList = [];

for (const { centreIds, ...fields } of concoursData) {
  let concours = await prisma.concours.findFirst({
    where: { nom: fields.nom },
  });

  if (!concours) {
    concours = await prisma.concours.create({
      data: {
        ...fields,
        id_admin: admin.id_admin,
        centres: {
          create: centreIds.map(id_centre => ({
            centre: { connect: { id_centre } },
          })),
        },
      },
    });
  }

  concoursList.push(concours);
}

console.log(`✅ ${concoursList.length} concours prêts`);

  // ── CANDIDAT DE TEST ───────────────────────────────────────
  // déclaré avec let ici — c'est le fix principal
  let candidat = await prisma.candidat.findFirst({
    where: { telephone: "22670000001" },
  });

  if (!candidat) {
    candidat = await prisma.candidat.create({
      data: {
        nom:               "Doe",
        prenom:            "John",
        sexe:              "HOMME",
        date_naissance:    new Date("1990-01-01"),
        lieu_naissance:    "Ouagadougou",
        pays_naissance:    "Burkina Faso",
        numero_cnib:       "B123456789",
        date_delivrance:   new Date("2015-06-15"),
        telephone:         "22670000001",
        email:             "johndoe@example.com",
        mot_de_passe:      await bcrypt.hash("Password@123", 10),
        statut_compte:     "ACTIF",
        type_candidat:     "DIRECT",
        choix_notification: "mail",
      },
    });
  }
  console.log("✅ Candidat de test prêt");

  // ── INSCRIPTION DU CANDIDAT DE TEST ───────────────────────
for (const concours of concoursList) {
  const exists = await prisma.inscription.findFirst({
    where: {
      id_candidat: candidat.id_candidat,
      id_concours: concours.id_concours,
    },
  });
  if (!exists) {
    await prisma.inscription.create({
      data: {
        statut_inscription: "EN_ATTENTE",
        candidat: { connect: { id_candidat: candidat.id_candidat } },
        concours: { connect: { id_concours: concours.id_concours } },
        // On choisit le premier centre disponible
        centre:   { connect: { id_centre: centres[0].id_centre } },
        paiement: {
          create: {
            montant:         concours.frais_inscription,
            statut_paiement: "ATTENTE",
          },
        },
      },
    });
  }
}
  console.log("✅ Inscriptions du candidat de test prêtes");

  // ── 10 000 CANDIDATS EN MASSE ──────────────────────────────
  const MOT_DE_PASSE_HASH = await bcrypt.hash("Password@123", 10);
  const TOTAL             = 500;
  const LOT               = 100;

  const nbExistants = await prisma.candidat.count();
  if (nbExistants >= TOTAL) {
    console.log(`⚠️  ${nbExistants} candidats déjà présents, étape ignorée.`);
  } else {
    console.log("\n⏳ Création des candidats en masse...");
    let total_crees = 0;
    let lot_num     = 0;

    while (total_crees < TOTAL) {
      const taille = Math.min(LOT, TOTAL - total_crees);
      const data   = [];

      for (let i = 0; i < taille; i++) {
        const sexe   = Math.random() > 0.5 ? "HOMME" : "FEMME";
        const prenom = sexe === "HOMME" ? rand(PRENOMS_H) : rand(PRENOMS_F);
        const num    = total_crees + i + 1;

        data.push({
          nom:                rand(NOMS),
          prenom,
          sexe,
          date_naissance:     genererDate(1975, 2000),
          lieu_naissance:     rand(LIEUX_NAISSANCE),
          pays_naissance:     "Burkina Faso",
          numero_cnib:        `BF${String(num).padStart(8, '0')}`,
          date_delivrance:    genererDate(2010, 2023),
          telephone: `2267${String(randInt(1000000, 9999999))}`,
          email:              null,
          mot_de_passe:       MOT_DE_PASSE_HASH,
          statut_compte:      "ACTIF",
          type_candidat:      "DIRECT",
          choix_notification: "sms",
        });
      }

      await prisma.candidat.createMany({
        data,
        skipDuplicates: true,
      });

      total_crees += taille;
      lot_num++;
      process.stdout.write(`\r   Lot ${lot_num} — ${total_crees}/${TOTAL} candidats créés`);
    }
    console.log("\n✅ Candidats créés");
  }

  // ── INSCRIPTIONS EN MASSE ──────────────────────────────────
  const existantesInscriptions = await prisma.inscription.count();
  if (existantesInscriptions >= TOTAL) {
    console.log(`⚠️  ${existantesInscriptions} inscriptions déjà présentes, étape ignorée.`);
  } else {
    console.log("\n⏳ Création des inscriptions...");

    const tousLesCandidats = await prisma.candidat.findMany({
      select: { id_candidat: true },
      take:   TOTAL,
    });

    const centresParConcours = {};
    for (const concours of concoursList) {
      const cc = await prisma.ConcoursCentre.findMany({
        where:  { concoursId: concours.id_concours },
        select: { centreId: true },
      });
      centresParConcours[concours.id_concours] = cc.map(c => c.centreId);
    }

    let inscriptions_creees = 0;
    const LOT_INS = 1000;

    for (let i = 0; i < tousLesCandidats.length; i += LOT_INS) {
      const lot  = tousLesCandidats.slice(i, i + LOT_INS);
      const data = [];

      for (const { id_candidat } of lot) {
        const concours  = rand(concoursList);
        const centresOk = centresParConcours[concours.id_concours];
        const id_centre = rand(centresOk);

        data.push({
          id_candidat,
          id_concours:        concours.id_concours,
          id_centre:          id_centre,
          statut_inscription: "EN_ATTENTE",
          date_inscription:   new Date(),
        });
      }

      await prisma.inscription.createMany({
        data,
        skipDuplicates: true,
      });

      inscriptions_creees += lot.length;
      process.stdout.write(`\r   ${inscriptions_creees}/${tousLesCandidats.length} inscriptions créées`);
    }
    console.log("\n✅ Inscriptions créées");
  }

  // ── RÉSUMÉ ─────────────────────────────────────────────────
  const [nbCandidats, nbInscriptions] = await Promise.all([
    prisma.candidat.count(),
    prisma.inscription.count(),
  ]);

  console.log("\n─────────────────────────────────────");
  console.log(`🎉 Seed terminé !`);
  console.log(`   👤 Candidats    : ${nbCandidats.toLocaleString()}`);
  console.log(`   📋 Inscriptions : ${nbInscriptions.toLocaleString()}`);
  console.log("─────────────────────────────────────\n");
}

main()
  .catch((err) => {
    console.error("\n❌ Erreur seed :", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());