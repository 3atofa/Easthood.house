import { sequelize } from '../config/database.js';

import { Article, initArticle } from './article.model.js';
import { ContactRequest, initContactRequest } from './contact-request.model.js';
import { Package, initPackage } from './package.model.js';
import { PasswordReset, initPasswordReset } from './password-reset.model.js';
import { Project, initProject } from './project.model.js';
import { Service, initService } from './service.model.js';
import { User, initUser } from './user.model.js';

// ------------------------------------------------------------------
// Register every model against the one shared connection.
// ------------------------------------------------------------------
initUser(sequelize);
initArticle(sequelize);
initContactRequest(sequelize);
initProject(sequelize);
initService(sequelize);
initPackage(sequelize);
initPasswordReset(sequelize);

// ------------------------------------------------------------------
// Associations
// ------------------------------------------------------------------

/**
 * A package BUNDLES several services, and a service can appear in several
 * packages — so this is many-to-many through a join table, not a hasMany.
 *
 * Deleting a service removes it from the bundles that contained it (the
 * join rows cascade) but does NOT delete those bundles: a package that
 * loses one of its services is still a real package that needs repricing,
 * and silently deleting it would lose the studio's work.
 */
Service.belongsToMany(Package, {
  through: 'package_services',
  as: 'packages',
  foreignKey: 'serviceId',
  otherKey: 'packageId',
  onDelete: 'CASCADE'
});

Package.belongsToMany(Service, {
  through: 'package_services',
  as: 'services',
  foreignKey: 'packageId',
  otherKey: 'serviceId',
  onDelete: 'CASCADE'
});

// Deleting a user must take their pending reset codes with them — an
// orphaned code is a live credential for an account that no longer exists.
User.hasMany(PasswordReset, {
  as: 'passwordResets',
  foreignKey: { name: 'userId', allowNull: false },
  onDelete: 'CASCADE',
  hooks: true
});

PasswordReset.belongsTo(User, {
  as: 'user',
  foreignKey: { name: 'userId', allowNull: false }
});

export {
  sequelize,
  User,
  Article,
  ContactRequest,
  PasswordReset,
  Project,
  Service,
  Package
};

export const models = {
  User,
  Article,
  ContactRequest,
  PasswordReset,
  Project,
  Service,
  Package
};
