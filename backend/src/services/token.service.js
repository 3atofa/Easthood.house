import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';

/**
 * Two tokens, two secrets, two lifetimes:
 *
 *   access  — short lived, sent on every request
 *   refresh — long lived, only ever sent to /auth/refresh
 *
 * Signing them with the same secret would let a stolen access token be
 * replayed as a refresh token, which is why env.js refuses to start if
 * the secrets match.
 */
const buildPayload = user => ({
  sub: user.id,
  email: user.email,
  role: user.role
});

export const signAccessToken = user =>
  jwt.sign(buildPayload(user), env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
    issuer: 'easthood.house'
  });

export const signRefreshToken = user =>
  jwt.sign({ sub: user.id, type: 'refresh' }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
    issuer: 'easthood.house'
  });

export const verifyAccessToken = token =>
  jwt.verify(token, env.jwt.secret, { issuer: 'easthood.house' });

export const verifyRefreshToken = token => {
  const payload = jwt.verify(token, env.jwt.refreshSecret, {
    issuer: 'easthood.house'
  });

  if (payload.type !== 'refresh') {
    throw new Error('Not a refresh token.');
  }

  return payload;
};

export const issueTokens = user => ({
  accessToken: signAccessToken(user),
  refreshToken: signRefreshToken(user)
});
