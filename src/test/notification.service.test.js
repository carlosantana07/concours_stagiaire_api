import { NotificationService } from "../services/NotificationService.js";
import { sendMail } from "../config/mailer.js";
import { OrangeApi } from "../api/Orange.api.js";

// MOCK crypto (optionnel si tu veux stabiliser l'OTP)
jest.mock("crypto", () => ({
  randomInt: () => 123456,
}));

jest.mock("../config/mailer.js");
jest.mock("../api/Orange.api.js");


describe("NotificationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("doit générer un OTP à 6 chiffres", () => {
    const service = new NotificationService();

    const otp = service.genererOtp();

    expect(otp).toBe("123456");
  });

  test("doit envoyer un OTP par email", async () => {
    const service = new NotificationService("test@mail.com");

    await service.envoyerOtpEmail("123456");

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ckprod7295@mail.com",
        subject: "Votre code de vérification",
      })
    );
  });

  test("doit envoyer un OTP par SMS via Orange API", async () => {
    const service = new NotificationService(null, "77000000");

    await service.envoyerOtpTelephone("123456");

    expect(OrangeApi).toHaveBeenCalledWith("77000000");
  });

  test("doit lever une erreur si email absent", async () => {
    const service = new NotificationService();

    await expect(
      service.envoyerOtpEmail("123456")
    ).rejects.toThrow("Email non défini");
  });

  test("doit lever une erreur si téléphone absent", async () => {
    const service = new NotificationService();

    await expect(
      service.envoyerOtpTelephone("123456")
    ).rejects.toThrow("numero de telephone non definis");
  });
});