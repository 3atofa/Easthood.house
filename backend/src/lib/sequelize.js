import pkg from 'sequelize';

/**
 * The one place that bridges Sequelize into ESM.
 *
 * Sequelize 6 is a CommonJS package whose entry point is `module.exports =
 * Sequelize` with the rest hung off it as properties. Node cannot statically
 * determine those names when importing a CJS module from ESM, so
 *
 *     import { DataTypes, Model } from 'sequelize';
 *
 * throws at load time:
 *     SyntaxError: Named export 'DataTypes' not found.
 *
 * Importing the default export and destructuring it works, because that
 * happens at runtime once the module object exists. Doing it here means the
 * workaround is written once and explained once, instead of being repeated —
 * and silently forgotten — in every model.
 *
 * This goes away on Sequelize 7, which ships native ESM.
 */
export const {
  Sequelize,
  DataTypes,
  Model,
  Op,
  QueryTypes,

  // Query helpers
  fn,
  col,
  literal,
  where,

  // Error types, for the error handler
  BaseError,
  ValidationError,
  UniqueConstraintError,
  ForeignKeyConstraintError,
  DatabaseError,
  ConnectionError
} = pkg;

/**
 * Fail loudly on the wrong major.
 *
 * `npm audit fix --force` will happily "fix" a Sequelize 6 advisory by
 * installing Sequelize 3, which has no class-based Model API at all. The
 * symptom is a bewildering `User.init is not a function` thrown from a
 * model file that is perfectly correct. This turns that into a sentence
 * that says what actually happened.
 */
if (typeof Model !== 'function' || typeof Model.init !== 'function') {
  throw new Error(
    'Sequelize is installed at an incompatible version. This project needs ' +
      'Sequelize 6 (class-based models). Run:  npm install sequelize@^6.37.3\n' +
      'Do NOT run `npm audit fix --force` here — it downgrades Sequelize ' +
      'across major versions to silence an advisory.'
  );
}

export default pkg;
