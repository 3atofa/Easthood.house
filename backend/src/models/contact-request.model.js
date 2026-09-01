import { DataTypes, Model } from '../lib/sequelize.js';

export const PROJECT_TYPES = [
  'branding',
  'web-design',
  'campaign',
  'production',
  'other'
];

export const CONTACT_STATUSES = ['new', 'in-review', 'replied', 'archived'];

export class ContactRequest extends Model {}

export const initContactRequest = sequelize => {
  ContactRequest.init(
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
        set(value) {
          this.setDataValue('email', String(value).trim().toLowerCase());
        },
        validate: { isEmail: true }
      },

      /**
       * Stored as typed, not normalised. A phone number is dialled by a
       * person, and reformatting it can destroy meaning — an extension, a
       * local trunk prefix, the way a country writes its own numbers.
       */
      phone: {
        type: DataTypes.STRING(32),
        allowNull: false,
        validate: { len: [6, 32] }
      },

      projectType: {
        type: DataTypes.ENUM(...PROJECT_TYPES),
        allowNull: false
      },

      message: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: { len: [10, 5000] }
      },

      status: {
        type: DataTypes.ENUM(...CONTACT_STATUSES),
        allowNull: false,
        defaultValue: 'new'
      },

      /** Private note the team adds while working the enquiry. */
      adminNote: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      repliedAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'ContactRequest',
      tableName: 'contact_requests',
      indexes: [{ fields: ['status'] }, { fields: ['created_at'] }]
    }
  );

  return ContactRequest;
};
