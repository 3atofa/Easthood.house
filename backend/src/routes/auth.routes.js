import { Router } from 'express';

import {
  changePassword,
  login,
  logout,
  me,
  refresh
} from '../controllers/auth.controller.js';
import {
  requestReset,
  resetPassword,
  verifyOtp
} from '../controllers/password-reset.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import {
  authLimiter,
  forgotPasswordLimiter,
  otpLimiter
} from '../middlewares/rate-limit.js';
import { validate } from '../middlewares/validate.js';
import {
  changePasswordRules,
  forgotPasswordRules,
  loginRules,
  refreshRules,
  resetPasswordRules,
  verifyOtpRules
} from '../validators/auth.validator.js';

export const authRouter = Router();

authRouter.post('/login', authLimiter, loginRules, validate, login);
authRouter.post('/refresh', refreshRules, validate, refresh);
authRouter.post('/logout', logout);

authRouter.get('/me', authenticate, me);

// ---- password reset by emailed one-time code ----
authRouter.post(
  '/forgot-password',
  forgotPasswordLimiter,
  forgotPasswordRules,
  validate,
  requestReset
);

authRouter.post('/verify-otp', otpLimiter, verifyOtpRules, validate, verifyOtp);

authRouter.post(
  '/reset-password',
  otpLimiter,
  resetPasswordRules,
  validate,
  resetPassword
);

authRouter.patch(
  '/password',
  authenticate,
  changePasswordRules,
  validate,
  changePassword
);
