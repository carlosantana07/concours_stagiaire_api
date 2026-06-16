// workers/sendMail.worker.js

const { Worker } = require("bullmq");
const { connection } = require("../config/redis");
const { NotificationService } = require("../services/Notification.service");

new Worker(
  "send-mail",
  async (job) => {
    const { otp, email, telephone, canal } = job.data;

    const notificationService = new NotificationService(
      email,
      telephone
    );

    if (canal === "sms") {
            console.log('envoyer par sms')
      await notificationService.envoyerOtpTelephone(otp);
    } else {
        console.log('envoyer par mail')
      await notificationService.envoyerOtpEmail(otp);
    }
  },
  {
    connection,
  }
);