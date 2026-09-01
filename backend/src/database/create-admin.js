#!/usr/bin/env node
/**
 * Create or reset the admin account.
 *
 * `db:seed` is deliberately idempotent — it uses findOrCreate and will not
 * touch a user that already exists. That is right for seed data, but it
 * means it can never fix the one problem you actually hit: an account whose
 * password you no longer know. This script is the escape hatch.
 *
 *   npm run admin
 *       Uses ADMIN_EMAIL / ADMIN_PASSWORD from .env.
 *
 *   npm run admin -- --email you@example.com --password "Your Passw0rd"
 *       Explicit credentials, overriding .env.
 *
 *   npm run admin -- --email you@example.com --password "x" --role editor
 *
 * Existing account -> the password is reset and the account reactivated.
 * No account       -> it is created.
 *
 * The password is never printed, and never logged by Sequelize (the INSERT
 * carries the bcrypt hash, not the plaintext).
 */

import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { USER_ROLES } from '../models/user.model.js';

/** Minimal flag parser: --key value, and --key=value. */
const parseArgs = argv => {
  const out = {};

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];

    if (!token.startsWith('--')) {
      continue;
    }

    const [flag, inline] = token.slice(2).split('=');

    if (inline !== undefined) {
      out[flag] = inline;
      continue;
    }

    const next = argv[i + 1];

    if (next && !next.startsWith('--')) {
      out[flag] = next;
      i++;
    } else {
      out[flag] = true;
    }
  }

  return out;
};

const fail = message => {
  console.error(`\n[admin] ${message}\n`);
  process.exit(1);
};

const run = async () => {
  const args = parseArgs(process.argv.slice(2));

  const email = String(args.email || env.admin.email || '').trim().toLowerCase();
  const password = String(args.password || env.admin.password || '');
  const name = String(args.name || 'EAST HOOD Admin');
  const role = String(args.role || 'admin');

  // ---- validate before touching the database ----
  if (!email) {
    fail(
      'No email. Pass --email you@example.com, or set ADMIN_EMAIL in .env.'
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail(`"${email}" is not a valid email address.`);
  }

  if (!password) {
    fail(
      'No password. Pass --password "…", or set ADMIN_PASSWORD in .env.'
    );
  }

  /**
   * 8 characters is not a style preference here: the sign-in form itself
   * carries Validators.minLength(8). A shorter password would be accepted
   * by the database and then be impossible to actually submit on the login
   * screen — a locked account with no error message to explain it.
   */
  if (password.length < 8) {
    fail(
      `That password is ${password.length} characters. The sign-in form ` +
        'requires at least 8, so a shorter one could never be submitted.'
    );
  }

  if (!USER_ROLES.includes(role)) {
    fail(`Unknown role "${role}". Use one of: ${USER_ROLES.join(', ')}.`);
  }

  try {
    await sequelize.authenticate();
  } catch (error) {
    fail(
      `Could not reach the database: ${error.message}\n` +
        '        Is Postgres running, and does the database exist?'
    );
  }

  await sequelize.sync();

  const existing = await User.scope('withPassword').findOne({ where: { email } });

  if (existing) {
    existing.password = password;
    existing.name = name;
    existing.role = role;
    existing.isActive = true;

    await existing.save();

    console.log(`\n[admin] password reset for ${email}`);
  } else {
    await User.create({ name, email, password, role, isActive: true });

    console.log(`\n[admin] account created: ${email}`);
  }

  /**
   * Prove the credential actually works rather than assuming it. If the
   * hashing hook ever misfires, this is where you find out — not at the
   * login screen.
   */
  const check = await User.scope('withPassword').findOne({ where: { email } });
  const ok = await check.verifyPassword(password);

  if (!ok) {
    fail('The password was saved but does not verify. Something is wrong.');
  }

  console.log(`[admin] verified: this password signs in.`);
  console.log(`[admin] role     : ${check.role}`);
  console.log(`[admin] sign in  : /admin/login\n`);

  await sequelize.close();
  process.exit(0);
};

run().catch(async error => {
  console.error('\n[admin] failed:', error.message, '\n');

  try {
    await sequelize.close();
  } catch {
    /* already closed */
  }

  process.exit(1);
});
