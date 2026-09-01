import { DataTypes, Model } from '../lib/sequelize.js';

import { slugify } from '../utils/slugify.js';

export const ARTICLE_CATEGORIES = [
  'insight',
  'case-note',
  'news',
  'guide'
];

/**
 * A published article. Every field a crawler or an assistant needs to treat
 * this as a distinct, citable page lives here — nothing is derived at render
 * time, because prerendered HTML has no second chance to fill a blank.
 */
export class Article extends Model {

  /** What the <title> tag should say. Falls back to the headline. */
  get effectiveMetaTitle() {
    return this.getDataValue('metaTitle') || this.getDataValue('title');
  }

  /** What <meta name="description"> should say. Falls back to the excerpt. */
  get effectiveMetaDescription() {
    return this.getDataValue('metaDescription') || this.getDataValue('excerpt');
  }

  toJSON() {
    return {
      ...super.toJSON(),
      metaTitle: this.effectiveMetaTitle,
      metaDescription: this.effectiveMetaDescription
    };
  }
}

export const initArticle = sequelize => {
  Article.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },

      /**
       * The URL. Derived from the title once, then FROZEN — see the hook.
       * A slug that changes needs a 301 for the old one, so slugs must not
       * drift silently every time an editor tweaks a headline.
       */
      slug: {
        type: DataTypes.STRING(180),
        allowNull: false,
        unique: true
      },

      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: { notEmpty: true, len: [3, 200] }
      },

      excerpt: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: { len: [20, 500] }
      },

      /** The body. Large — never selected in list queries. */
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: { len: [50, 200000] }
      },

      /**
       * Per-page og:image. Required in practice: a site-wide fallback makes
       * every share look identical, so the editor enforces it.
       */
      coverImage: {
        type: DataTypes.STRING(255),
        allowNull: true
      },

      coverAlt: {
        type: DataTypes.STRING(255),
        allowNull: true
      },

      category: {
        type: DataTypes.ENUM(...ARTICLE_CATEGORIES),
        allowNull: false,
        defaultValue: 'insight'
      },

      tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: []
      },

      author: {
        type: DataTypes.STRING(120),
        allowNull: false,
        defaultValue: 'EAST HOOD'
      },

      // ---- SEO overrides. Blank means "use the title/excerpt". ----
      metaTitle: {
        type: DataTypes.STRING(70),
        allowNull: true
      },

      metaDescription: {
        type: DataTypes.STRING(180),
        allowNull: true
      },

      /** Minutes. Shown on the card and in Article schema. */
      readingMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
      },

      views: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },

      isPublished: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },

      /**
       * Set the first time the article is published and then left alone —
       * Article schema needs a stable datePublished separate from
       * dateModified, which is what updatedAt gives us.
       */
      publishedAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'Article',
      tableName: 'articles',

      indexes: [
        { fields: ['slug'], unique: true },
        { fields: ['is_published', 'published_at'] },
        { fields: ['category'] }
      ],

      hooks: {
        beforeValidate: article => {
          // Derive the slug ONCE, on creation. After that the URL is a
          // promise to every link that already points at it.
          if (!article.slug && article.title) {
            article.slug = slugify(article.title);
          }

          if (article.content) {
            const words = String(article.content)
              .replace(/<[^>]+>/g, ' ')
              .split(/\s+/)
              .filter(Boolean).length;

            article.readingMinutes = Math.max(1, Math.round(words / 200));
          }
        },

        beforeSave: article => {
          // Stamp publication the first time it goes live, never again.
          if (article.isPublished && !article.publishedAt) {
            article.publishedAt = new Date();
          }
        }
      }
    }
  );

  return Article;
};
