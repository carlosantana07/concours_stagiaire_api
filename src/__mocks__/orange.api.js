export class OrangeApi {
  constructor(phone) {
    this.phone = phone;
  }

  SendOtp = jest.fn().mockResolvedValue({
    success: true,
    message: "OTP envoyé",
  });
}