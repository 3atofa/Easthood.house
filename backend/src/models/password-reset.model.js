import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';
import { DataTypes, Model } from '../lib/sequelize.js';

/** How long a code stays valid. Short: it is emailed, not stored by the user. */
export const OTP_TTL_MINUTES = 10;

/** Wrong guesses allowed before the code is burned. */
export const MAX_ATTEMPTS = 5;

/**
 * A one-time code for resetting a password.
 *
 * The code is stored as a BCRYPT HASH, never in plain text. A reset table
 * full of readable codes is a second password database: anyone with a
 * moment's read access to it can take over every account with a pending
 * reset.
 */
export class PasswordReset extends Model {

  /** 6 digits, from a CSPRNG — Math.random() is predictable. */
  static generateCode() {
    return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  }

  static async hashCode(code) {
    return bcrypt.hash(code, 10);
  }

  async verifyCode(code) {
    return bcrypt.compare(String(code), this.codeHash);
  }

  get isExpired() {
    return this.expiresAt.getTime() < Date.now();
  }

  get isSpent() {
    return this.consumedAt !== null || this.attempts >= MAX_ATTEMPTS;
  }

  get isUsable() {
    return !this.isExpired && !this.isSpent;
  }
}

export const initPasswordReset = sequelize => {
  PasswordReset.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },

      userId: {
        type: DataTypes.UUID,
        allowNull: false
      },

      /** bcrypt hash of the 6-digit code. */
      codeHash: {
        type: DataTypes.STRING,
        allowNull: false
      },

      /**
       * Issued once the code is verified, and exchanged for the actual
       * password change. Splitting verification from the reset means the
       * code is never sent again alongside the new password.
       */
      resetToken: {
        type: DataTypes.STRING(128),
        allowNull: true,
        unique: true
      },

      resetTokenExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true
      },

      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },

      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
      },

      consumedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },

      /** Recorded for the audit trail, not used for decisions. */
      requestIp: {
        type: DataTypes.STRING(64),
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'PasswordReset',
      tableName: 'password_resets',
      indexes: [
        { fields: ['user_id'] },
        { fields: ['reset_token'] },
        { fields: ['expires_at'] }
      ]
    }
  );

  return PasswordReset;
};
