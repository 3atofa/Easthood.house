import { body } from 'express-validator';

export const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Enter a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
];

export const refreshRules = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required.')
];

export const changePasswordRules = [
  body('currentPassword')
    .notEmpty().withMessage('Enter your current password.'),

  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters.')
    .matches(/[a-z]/).withMessage('Include at least one lowercase letter.')
    .matches(/[A-Z]/).withMessage('Include at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('Include at least one number.')
];

// ------------------------------------------------------------------
// Password reset
// ------------------------------------------------------------------

export const forgotPasswordRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Enter a valid email address.')
    .normalizeEmail()
];

export const verifyOtpRules = [
  body('email')
    .trim()
    .isEmail().withMessage('Enter a valid email address.')
    .normalizeEmail(),

  // Exactly six digits. Stripping spaces first so a pasted "123 456" works.
  body('code')
    .customSanitizer(value => String(value ?? '').replace(/\s+/g, ''))
    .matches(/^\d{6}$/)
    .withMessage('Enter the 6-digit code.')
];

export const resetPasswordRules = [
  body('resetToken')
    .isLength({ min: 32 })
    .withMessage('That reset link is not valid.'),

  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .matches(/[a-z]/).withMessage('Include at least one lowercase letter.')
    .matches(/[A-Z]/).withMessage('Include at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('Include at least one number.')
];
