import rateLimit from 'express-rate-limit';

const message = {
  success: false,
  message: 'Too many requests. Please try again shortly.'
};

/** Broad ceiling for the whole API. */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message
});

/**
 * Login is the one endpoint worth brute-forcing, so it gets a much
 * tighter budget. Successful logins do not count against it.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many sign-in attempts. Please try again in a few minutes.'
  }
});

/** The public contact form — open to the world, so keep it modest. */
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'You have sent several enquiries already. Please email us directly.'
  }
});

/**
 * Asking for a reset code sends an email and writes a row. Left open it is
 * both a mail-bomb tool aimed at one address and a way to probe which
 * addresses exist by timing. Tight budget, keyed by IP.
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many reset requests. Please try again in an hour.'
  }
});

/**
 * The per-code attempt cap lives in the model; this is the second wall,
 * stopping someone from burning through fresh codes at speed.
 */
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts. Please wait a few minutes.'
  }
});
