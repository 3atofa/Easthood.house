import { DataTypes, Model } from '../lib/sequelize.js';

import { slugify } from '../utils/slugify.js';

export class Project extends Model {}

export const initProject = sequelize => {
  Project.init(
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

      title: {
        type: DataTypes.STRING(160),
        allowNull: false,
        validate: { notEmpty: true }
      },

      client: {
        type: DataTypes.STRING(160),
        allowNull: false,
        defaultValue: 'Confidential'
      },

      category: {
        type: DataTypes.STRING(80),
        allowNull: false
      },

      year: {
        type: DataTypes.STRING(9),
        allowNull: false
      },

      excerpt: {
        type: DataTypes.TEXT,
        allowNull: false
      },

      cover: {
        type: DataTypes.STRING(255),
        allowNull: true
      },

      /** Service names credited on the case study. */
      services: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: []
      },

      /** Body copy, one array entry per paragraph. */
      body: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        allowNull: false,
        defaultValue: []
      },

      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },

      isPublished: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {
      sequelize,
      modelName: 'Project',
      tableName: 'projects',

      indexes: [{ fields: ['slug'], unique: true }, { fields: ['sort_order'] }],

      hooks: {
        // Keep the slug in step with the title unless one was set by hand.
        beforeValidate: project => {
          if (!project.slug && project.title) {
            project.slug = slugify(project.title);
          }
        }
      }
    }
  );

  return Project;
};
