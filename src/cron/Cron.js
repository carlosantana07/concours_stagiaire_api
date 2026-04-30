import cron from "node-cron";
import { prisma } from "../prisma.js";


  export const  UpdateDateConcours = () =>{
    cron.schedule("0 0 * * *", async () => {
      try {
        // console.log("Cron :", new Date());

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await prisma.concours.updateMany({
          where: {
            date_fin: { lt: today },
            statut_concours: { not: "FERMER" },
          },
          data: {
            statut_concours: "FERMER",
          },
        });
      } catch (error) {
        console.error("Erreur dans le cron :", error);
      }
    });
  }

  export const  UpdateStatusConcours =()=> {
    //  console.log(" Cron UpdateStatusConcours exécute a", new Date().toLocaleString());
    cron.schedule("7 12 * * *", async () => {
      
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await prisma.concours.updateMany({
          where: {
            date_debut: { equals: today },
            date_fin: { gt: today },
            statut_concours: { not: "OUVERT" },
          },
          data: {
            statut_concours: "OUVERT",
          },
        });
              console.log(" Statuts concours mis à jour avec succès");
      } catch (err) {
        console.error("Erreur dans le cron update status ", err);
      }
    });
  }

  export const DeleteOtp = () => {
    cron.schedule("0 0 * * *", async () => {
      try {
        const today = new Date();
        // today.setHours(0,0,0,0);

        await prisma.candidat.updateMany({
          where: {
            otp: { not: null },
            otp_expiration: { lt: today },
          },
          data: {
            otp: null,
            otp_expiration: null,
          },
        });
      } catch (err) {
        //voir mes erreurs

        console.log("une erreur est survenue", err);
      }
    });
  }

  // async backup() {
  //   try {
  //     const [candidat, concours, inscription, admin, catec, centre] =
  //       await Promise.all([
  //         await prisma.candidat.findMany({}),
  //         await prisma.concours.findMany({}),
  //         await prisma.inscription.findMany({}),
  //         await prisma.admin.findMany({}),
  //         await prisma.categorieConcours.findMany({}),
  //         await prisma.centre.findMany({}),
  //       ]);
  //   } catch (err) {}
  // }

