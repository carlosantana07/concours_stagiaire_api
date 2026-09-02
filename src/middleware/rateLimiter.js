import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export class rateLi {
  

static limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,


  keyGenerator: ipKeyGenerator,

  message: {
    error: "Veuillez reessayer dans 5 minutes",
  },

  standardHeaders: true,
  legacyHeaders: false,
});


  static authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 5,

    message: {
      error: "Trop de tentatives, réessayez dans 10 minutes",
    },

    standardHeaders: true,
    legacyHeaders: false,
  });


static otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,

  keyGenerator: (req) => {
    const id = req.body.email || req.body.telephone;

    
    return id ? `otp:${id}` : ipKeyGenerator(req);
  },

  message: {
    error: "Trop de tentatives OTP. Attendez 5 minutes.",
  },

  standardHeaders: true,
  legacyHeaders: false,
});

};
