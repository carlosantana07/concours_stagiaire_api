import { connection as redis } from "../config/redis.js";

export class OrangeApi {
  constructor(telephone) {
    this.clientId = process.env.CLIEND_ID;
    this.clientSecret = process.env.CLIENT_SECRET;
    this.senderNumber = process.env.SENDER_NU;
    this.telephone = telephone;
    this.token = null;
  }

  //s'ouscire a l'api de orange pour recuprer le access token
  async SuscribAPi() {
    try {
      const response = await fetch("https://api.orange.com/oauth/v3/token", {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Erreur token Orange:", data);
        return null;
      }

      this.token = data.access_token;


      const ttl = (data.expires_in || 3600) - 60;
      await redis.set("orange-access-token", this.token, "EX", ttl);

      return this.token;
    } catch (err) {
      console.error("Erreur SuscribAPi:", err);
      return null;
    }
  }

  async #getValidToken() {
    const cached = await redis.get("orange-access-token");
    if (cached) return cached; 
    return await this.SuscribAPi();
  }

  async SendOtp({ otp }) {
    try {
      let token = await this.#getValidToken();
      if (!token) throw new Error("Impossible d'obtenir un token Orange");

      const payload = {
        outboundSMSMessageRequest: {
          address: `tel:+${this.telephone}`,
          senderAddress: `tel:+${this.senderNumber}`,
          senderName: "E-concours",
          outboundSMSTextMessage: {
            message: `Votre code OTP est : ${otp}\nLe code expirera dans 5 min`,
          },
        },
      };

      const url = `https://api.orange.com/smsmessaging/v1/outbound/tel%3A%2B${this.senderNumber}/requests`;

      let response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });


      if (response.status === 401) {
        console.warn("Token expirer ou revoqur, renouvellement...");
        await redis.del("orange-access-token");
        token = await this.SuscribAPi();
        if (!token) throw new Error("Renouvellement du token échoué");

        response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();
      if (!response.ok) console.error("Erreur SMS Orange:", data);
      return data;
    } catch (err) {
      console.error("Erreur SendOtp:", err);

      if(err.messageId ==='POL001'){
        console.log('Le solde de votre compte sms est vide')
      }
      return null;
    }
  }
}