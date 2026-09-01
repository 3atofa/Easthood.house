import crypto from 'node:crypto';

import { Op } from '../lib/sequelize.js';

import {
  MAX_ATTEMPTS,
  OTP_TTL_MINUTES,
  PasswordReset
} from '../models/password-reset.model.js';
import { User } from '../models/index.js';
import {
  sendPasswordChangedNotice,
  sendPasswordResetCode
} from '../services/mail.service.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { asyncHandler } from '../middlewares/async-handler.js';

/** The reset token is short-lived: it exists only to cross one screen. */
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

/**
 * The SAME response whether or not the address exists.
 *
 * Anything else turns this endpoint into an account-enumeration oracle:
 * an attacker submits a list of addresses and learns which ones have
 * accounts, which is exactly the list they want before a credential-stuffing
 * run. The cost of this choice is a slightly vaguer message for the honest
 * user, and that is the right trade.
 */
const NEUTRAL = 'If that address has an account, a code is on its way.';

/**
 * POST /api/auth/forgot-password
 */
export const requestReset = asyncHandler(async (req, res) => {
  const email = String(req.body.email).trim().toLowerCase();

  const user = await User.findOne({ where: { email } });

  // Deactivated accounts get the same silence as unknown ones.
  if (user && user.isActive) {
    // Any earlier pending code is dead the moment a new one is asked for,
    // so two live codes can never exist for one account.
    await PasswordReset.update(
      { consumedAt: new Date() },
      {
        where: {
          userId: user.id,
          consumedAt: null
        }
      }
    );

    const code = PasswordReset.generateCode();

    await PasswordReset.create({
      userId: user.id,
      codeHash: await PasswordReset.hashCode(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
      requestIp: req.ip
    });

    // Never awaited into the response path: whether mail succeeds must not
    // change what the caller learns.
    await sendPasswordResetCode({
      email: user.email,
      name: user.name,
      code,
      minutes: OTP_TTL_MINUTES
    });
  }

  return sendSuccess(res, {
    message: NEUTRAL,
    data: { expiresInMinutes: OTP_TTL_MINUTES }
  });
});

/**
 * POST /api/auth/verify-otp
 *
 * Exchanges a correct code for a short-lived reset token. The code itself
 * is never sent again after this.
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const email = String(req.body.email).trim().toLowerCase();
  const code = String(req.body.code).trim();

  const user = await User.findOne({ where: { email } });

  // One message for every failure mode below — wrong code, expired code,
  // no such account. Distinguishing them leaks whether the account exists.
  const invalid = ApiError.badRequest(
    'That code is not valid, or it has expired. Request a new one.'
  );

  if (!user || !user.isActive) {
    throw invalid;
  }

  const reset = await PasswordReset.findOne({
    where: {
      userId: user.id,
      consumedAt: null,
      expiresAt: { [Op.gt]: new Date() }
    },
    order: [['createdAt', 'DESC']]
  });

  if (!reset || !reset.isUsable) {
    throw invalid;
  }

  if (!(await reset.verifyCode(code))) {
    // Count the miss BEFORE responding, so a brute-force run burns the code
    // rather than getting unlimited guesses.
    reset.attempts += 1;

    if (reset.attempts >= MAX_ATTEMPTS) {
      reset.consumedAt = new Date();
    }

    await reset.save();

    const left = Math.max(0, MAX_ATTEMPTS - reset.attempts);

    throw ApiError.badRequest(
      left > 0
        ? `That code is not correct. ${left} attempt${left === 1 ? '' : 's'} left.`
        : 'Too many incorrect attempts. Request a new code.'
    );
  }

  const resetToken = crypto.randomBytes(48).toString('hex');

  reset.resetToken = resetToken;
  reset.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  reset.attempts = 0;

  await reset.save();

  return sendSuccess(res, {
    message: 'Code verified.',
    data: { resetToken, expiresInMinutes: RESET_TOKEN_TTL_MS / 60000 }
  });
});

/**
 * POST /api/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword } = req.body;

  const reset = await PasswordReset.findOne({
    where: {
      resetToken,
      consumedAt: null,
      resetTokenExpiresAt: { [Op.gt]: new Date() }
    },
    include: [{ association: 'user' }]
  });

  if (!reset || !reset.user) {
    throw ApiError.badRequest(
      'That reset link has expired. Start again from the beginning.'
    );
  }

  const user = await User.scope('withPassword').findByPk(reset.userId);

  if (!user || !user.isActive) {
    throw ApiError.badRequest('That account is no longer active.');
  }

  user.password = newPassword;
  await user.save();

  // Burn the record — one code, one reset, no replay.
  reset.consumedAt = new Date();
  reset.resetToken = null;
  reset.resetTokenExpiresAt = null;
  await reset.save();

  // Any other pending reset for this user dies with it.
  await PasswordReset.update(
    { consumedAt: new Date() },
    { where: { userId: user.id, consumedAt: null } }
  );

  // Tell the owner out of band, so a takeover does not go unnoticed.
  await sendPasswordChangedNotice({ email: user.email, name: user.name });

  return sendSuccess(res, {
    message: 'Password updated. You can sign in now.'
  });
});
