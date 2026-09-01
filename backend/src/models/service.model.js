import { DataTypes, Model } from '../lib/sequelize.js';

import { slugify } from '../utils/slugify.js';

export class Service extends Model {

  /** Money is stored in minor units; the client is handed major units. */
  toJSON() {
    const base = super.toJSON();

    return {
      ...base,
      price: (Number(base.priceMinor) || 0) / 100
    };
  }
}

export const initService = sequelize => {
  Service.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },

      slug: {
        type: DataTypes.STRING(160),
        allowNull: false,
        unique: true
      },

      /** Display number on the site — "01", "02"… */
      code: {
        type: DataTypes.STRING(8),
        allowNull: true
      },

      title: {
        type: DataTypes.STRING(160),
        allowNull: false,
        validate: { notEmpty: true }
      },

      summary: {
        type: DataTypes.TEXT,
        allowNull: false
      },

      /** Bullet list shown beside the summary. */
      deliverables: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: []
      },

      icon: {
        type: DataTypes.STRING(60),
        allowNull: true
      },

      /**
       * What this service costs on its own, in MINOR units (piastres).
       * An integer, because floats and money do not mix — a package's
       * saving is derived by subtracting these, and rounding drift there
       * would show up as a wrong number on the public page.
       */
      priceMinor: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 }
      },

      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'EGP',
        set(value) {
          this.setDataValue('currency', String(value).trim().toUpperCase());
        }
      },

      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },

      isPublished: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: 'Service',
      tableName: 'services',

      indexes: [{ fields: ['slug'], unique: true }, { fields: ['sort_order'] }],

      hooks: {
        beforeValidate: service => {
          if (!service.slug && service.title) {
            service.slug = slugify(service.title);
          }
        }
      }
    }
  );

  return Service;
};
