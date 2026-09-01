import dotenv from 'dotenv';

dotenv.config();

/**
 * Reads an environment variable, failing loudly when a required one is
 * missing. A server that boots with half its configuration is far worse
 * than one that refuses to start.
 */
const read = (key, { required = false, fallback } = {}) => {
  const value = process.env[key];

  if (value === undefined || value === '') {
    if (required) {
      throw new Error(`Missing required environment variable: ${key}`);
    }

    return fallback;
  }

  return value;
};

const number = (key, fallback) => {
  const value = read(key);
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
};

const boolean = (key, fallback = false) => {
  const value = read(key);

  return value === undefined ? fallback : /^(1|true|yes)$/i.test(value);
};

export const env = {
  nodeEnv: read('NODE_ENV', { fallback: 'development' }),
  port: number('PORT', 3000),

  get isProduction() {
    return this.nodeEnv === 'production';
  },

  db: {
    host: read('DB_HOST', { fallback: 'localhost' }),
    port: number('DB_PORT', 5432),
    name: read('DB_NAME', { required: true }),
    user: read('DB_USER', { required: true }),
    password: read('DB_PASSWORD', { fallback: '' })
  },

  jwt: {
    secret: read('JWT_SECRET', { required: true }),
    expiresIn: read('JWT_EXPIRE', { fallback: '7d' }),
    refreshSecret: read('JWT_REFRESH_SECRET', { required: true }),
    refreshExpiresIn: read('JWT_REFRESH_EXPIRE', { fallback: '30d' })
  },

  mail: {
    host: read('EMAIL_HOST'),
    port: number('EMAIL_PORT', 587),
    secure: boolean('EMAIL_SECURE', false),
    user: read('EMAIL_USER'),
    pass: read('EMAIL_PASS'),
    from: read('EMAIL_FROM', { fallback: 'EAST HOOD <no-reply@easthood.house>' })
  },

  admin: {
    email: read('ADMIN_EMAIL'),
    password: read('ADMIN_PASSWORD')
  },

  clientUrl: read('CLIENT_URL', { fallback: 'http://localhost:4200' }),
  siteOrigin: read('SITE_ORIGIN', { fallback: 'http://localhost:4200' }),

  /**
   * The ONE canonical origin, no trailing slash. Every canonical tag,
   * sitemap <loc> and og:url is built from this. Two spellings of the same
   * site (www / non-www, http / https) is how a site earns "Duplicate
   * without user-selected canonical".
   */
  siteUrl: read('SITE_URL', { fallback: 'https://easthood.house' }).replace(
    /\/+$/,
    ''
  ),

  /** IndexNow key file at the site root; blank disables the ping. */
  indexNowKey: read('INDEXNOW_KEY')
};

/**
 * Refuse to start if the two JWT secrets are the same — otherwise a leaked
 * access token can be replayed as a refresh token and the short access
 * lifetime buys nothing.
 */
if (env.jwt.secret === env.jwt.refreshSecret) {
  throw new Error(
    'JWT_SECRET and JWT_REFRESH_SECRET must be different values.'
  );
}
