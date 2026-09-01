import { DataTypes, Model } from 'sequelize';

import { slugify } from '../utils/slugify.js';

export const BILLING_PERIODS = ['one-off', 'monthly', 'quarterly', 'yearly'];

/**
 * A PACKAGE is a bundle of several services sold together at one price.
 *
 * It does NOT belong to a service — it combines many of them, through the
 * package_services join table. The price is set by hand rather than derived,
 * so the studio can pitch a round number; the saving against the sum of the
 * individual service prices is what gets calculated.
 *
 * Money is in MINOR units (piastres for EGP) as an integer throughout.
 */
export class Package extends Model {

  toJSON() {
    const base = super.toJSON();

    const priceMinor = Number(base.priceMinor) || 0;

    // Only meaningful when the services association was loaded.
    const services = Array.isArray(base.services) ? base.services : [];

    const totalMinor = services.reduce(
      (sum, service) => sum + (Number(service.priceMinor) || 0),
      0
    );

    return {
      ...base,
      price: priceMinor / 100,

      /** What the same services would cost bought separately. */
      servicesTotal: totalMinor / 100,

      /** Never negative: a package priced above its parts saves nothing. */
      savings: Math.max(0, totalMinor - priceMinor) / 100,

      savingsPercent:
        totalMinor > 0
          ? Math.round(((totalMinor - priceMinor) / totalMinor) * 1000) / 10
          : 0
    };
  }
}

export const initPackage = sequelize => {
  Package.init(
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

      name: {
        type: DataTypes.STRING(120),
        allowNull: false,
        validate: { notEmpty: true }
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      /** Extras the bundle adds beyond the services themselves. */
      features: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: []
      },

      /** The bundle price, set by hand. Minor units. */
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

      billingPeriod: {
        type: DataTypes.ENUM(...BILLING_PERIODS),
        allowNull: false,
        defaultValue: 'one-off'
      },

      isPopular: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },

      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },

      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: 'Package',
      tableName: 'packages',

      indexes: [{ fields: ['slug'], unique: true }, { fields: ['sort_order'] }],

      hooks: {
        beforeValidate: pkg => {
          if (!pkg.slug && pkg.name) {
            pkg.slug = slugify(pkg.name);
          }
        }
      }
    }
  );

  return Package;
};
