import bcrypt from 'bcryptjs';
import { DataTypes, Model } from '../lib/sequelize.js';

export const USER_ROLES = ['admin', 'editor'];

const SALT_ROUNDS = 12;

export class User extends Model {

  /** Never compare passwords anywhere but here. */
  async verifyPassword(plain) {
    return bcrypt.compare(plain, this.password);
  }

  /** Shape sent to the client — the hash must never leave the server. */
  toJSON() {
    const { password, ...safe } = super.toJSON();
    return safe;
  }
}

export const initUser = sequelize => {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },

      name: {
        type: DataTypes.STRING(120),
        allowNull: false,
        validate: { notEmpty: true, len: [2, 120] }
      },

      email: {
        type: DataTypes.STRING(160),
        allowNull: false,
        unique: true,
        set(value) {
          this.setDataValue('email', String(value).trim().toLowerCase());
        },
        validate: { isEmail: true }
      },

      password: {
        type: DataTypes.STRING,
        allowNull: false
      },

      role: {
        type: DataTypes.ENUM(...USER_ROLES),
        allowNull: false,
        defaultValue: 'editor'
      },

      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },

      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',

      defaultScope: {
        attributes: { exclude: ['password'] }
      },

      scopes: {
        // Opt in explicitly when the hash is actually needed (login).
        withPassword: { attributes: {} }
      },

      hooks: {
        beforeSave: async user => {
          if (user.changed('password')) {
            user.password = await bcrypt.hash(user.password, SALT_ROUNDS);
          }
        }
      }
    }
  );

  return User;
};
