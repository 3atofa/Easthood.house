import { env } from '../config/env.js';
import {
  Article,
  Package,
  Project,
  Service,
  User,
  sequelize
} from '../models/index.js';

/**
 * Idempotent seed: safe to run repeatedly. Nothing here overwrites a row
 * that already exists, so running it against a live database will not
 * clobber content the studio has edited.
 */

/**
 * The development admin.
 *
 * Deliberately hard-coded rather than read from .env, so `npm run db:seed`
 * always produces the same known login and nobody has to go hunting for a
 * credential to get into the portal.
 *
 * That convenience is exactly why it is dangerous: this file is committed,
 * so this password is public to anyone with the repository. The guard in
 * seedAdmin() refuses to create it when NODE_ENV=production. On a real
 * deployment, make the account with:
 *
 *     npm run admin -- --email you@example.com --password "..."
 */
const DEV_ADMIN = {
  name: 'EAST HOOD Admin',
  email: 'admin@easthood.house',

  // 8+ chars with upper, lower, digit and symbol — the sign-in form
  // enforces a minimum length, so a shorter one could never be submitted.
  password: 'EastHood@2026'
};

const seedAdmin = async () => {
  /**
   * Never in production. A seeded account with a password published in the
   * source tree is a backdoor, and it would be created silently the first
   * time someone ran the seed on a live database.
   */
  if (env.isProduction) {
    console.warn(
      '[seed] NODE_ENV=production — refusing to create the development admin.'
    );
    console.warn(
      '[seed] Create the real one with: npm run admin -- --email … --password …'
    );
    return;
  }

  const [user, created] = await User.findOrCreate({
    where: { email: DEV_ADMIN.email },
    defaults: {
      name: DEV_ADMIN.name,
      email: DEV_ADMIN.email,
      password: DEV_ADMIN.password,
      role: 'admin',
      isActive: true
    }
  });

  if (created) {
    console.log(`[seed] admin created: ${user.email}`);
  } else {
    /**
     * findOrCreate leaves an existing row alone, which would mean a stale
     * password on a database that has been seeded before — and no way to
     * tell from the output. Reset it, so what this script prints is always
     * true.
     */
    user.password = DEV_ADMIN.password;
    user.isActive = true;
    await user.save();

    console.log(`[seed] admin already existed — password reset: ${user.email}`);
  }
};

const SERVICES = [
  {
    code: '01',
    title: 'Brand Strategy',
    summary:
      'Positioning, narrative and architecture. The argument the brand makes before it makes anything else.',
    deliverables: ['Positioning', 'Brand narrative', 'Naming', 'Messaging framework'],
    icon: 'fa-compass',
    price: 45000,
    sortOrder: 1
  },
  {
    code: '02',
    title: 'Visual Identity',
    summary:
      'Systems designed for recall — logotype, type, colour, motion and the rules that keep them honest.',
    deliverables: ['Logotype & marks', 'Type & colour system', 'Design guidelines', 'Packaging'],
    icon: 'fa-pen-nib',
    price: 70000,
    sortOrder: 2
  },
  {
    code: '03',
    title: 'Creative Direction',
    summary:
      'One idea, carried across every channel without being diluted in translation.',
    deliverables: ['Campaign platforms', 'Art direction', 'Channel systems', 'Launch design'],
    icon: 'fa-lightbulb',
    price: 60000,
    sortOrder: 3
  },
  {
    code: '04',
    title: 'Film & Production',
    summary:
      'Film, stills and post produced in-house, so the story that was sold is the story that ships.',
    deliverables: ['Film & showreels', 'Photography', 'Post production', 'Content libraries'],
    icon: 'fa-film',
    price: 80000,
    sortOrder: 4
  }
];

const seedServices = async () => {
  for (const { price, ...service } of SERVICES) {
    const [record, created] = await Service.findOrCreate({
      where: { title: service.title },
      defaults: {
        ...service,
        priceMinor: Math.round(price * 100),
        currency: 'EGP',
        isPublished: true
      }
    });

    console.log(
      created
        ? `[seed] service created: ${record.title} (${price.toLocaleString()} EGP)`
        : `[seed] service exists: ${record.title}`
    );
  }
};

/**
 * Packages are CROSS-SERVICE bundles: each one combines whole services and
 * is priced below their sum. The price is set by hand rather than derived,
 * so it can be a round number the studio is happy to pitch — the saving is
 * what gets calculated.
 */
const PACKAGES = [
  {
    name: 'Launch Kit',
    description:
      'Everything a new brand needs to exist: the argument, and the system that carries it.',
    serviceTitles: ['Brand Strategy', 'Visual Identity'],
    // Services total 115,000 — bundled at 95,000.
    price: 95000,
    features: ['Two-week turnaround', 'One round of revisions', 'Brand book'],
    isPopular: true,
    sortOrder: 1
  },
  {
    name: 'Campaign Kit',
    description:
      'A platform and the production to execute it, briefed and shot as one job.',
    serviceTitles: ['Creative Direction', 'Film & Production'],
    // Services total 140,000 — bundled at 120,000.
    price: 120000,
    features: ['Single creative platform', 'One shoot day', 'Edit and grade'],
    sortOrder: 2
  },
  {
    name: 'The Full Studio',
    description:
      'The whole studio on one brand: strategy through to the film that launches it.',
    serviceTitles: [
      'Brand Strategy',
      'Visual Identity',
      'Creative Direction',
      'Film & Production'
    ],
    // Services total 255,000 — bundled at 195,000.
    price: 195000,
    features: [
      'Everything in Launch Kit and Campaign Kit',
      'Dedicated creative director',
      'Twelve months of support'
    ],
    sortOrder: 3
  }
];

const seedPackages = async () => {
  for (const { serviceTitles, price, ...pkg } of PACKAGES) {
    const [record, created] = await Package.findOrCreate({
      where: { name: pkg.name },
      defaults: {
        ...pkg,
        priceMinor: Math.round(price * 100),
        currency: 'EGP',
        isActive: true
      }
    });

    if (!created) {
      console.log(`[seed] package exists: ${record.name}`);
      continue;
    }

    const services = await Service.findAll({ where: { title: serviceTitles } });

    await record.setServices(services);

    const total = services.reduce((sum, s) => sum + s.priceMinor, 0) / 100;

    console.log(
      `[seed] package created: ${record.name} — ${services.length} services, ` +
        `worth ${total.toLocaleString()}, priced ${price.toLocaleString()} ` +
        `(saves ${(total - price).toLocaleString()} EGP)`
    );
  }
};

const PROJECTS = [
  {
    slug: 'strategic-identity',
    title: 'Strategic Identity',
    client: 'Confidential',
    category: 'BRAND IDENTITY',
    year: '2026',
    excerpt: 'A positioning system and identity built to survive a crowded category.',
    cover: '/oldphonebg.png',
    services: ['Brand Strategy', 'Visual Identity', 'Art Direction'],
    body: [
      'The brand had recognition but no point of view. We rebuilt the story from the positioning up, then designed an identity flexible enough to carry it across retail, film and social.',
      'The result is a system that reads as one voice everywhere it appears — and gives the team a way to say no to everything that is not the brand.'
    ],
    sortOrder: 1
  },
  {
    slug: 'creative-direction',
    title: 'Creative Direction',
    client: 'Confidential',
    category: 'CAMPAIGN',
    year: '2026',
    excerpt: 'One idea, three markets, a campaign engineered to travel.',
    cover: '/droped phone.png',
    services: ['Creative Direction', 'Campaign Design', 'Production'],
    body: [
      'A single creative platform, localised without being diluted. We ran concept, direction and production end to end.',
      'Every asset was designed to work at a glance first and reward attention second.'
    ],
    sortOrder: 2
  },
  {
    slug: 'visual-stories',
    title: 'Visual Stories',
    client: 'Confidential',
    category: 'PRODUCTION',
    year: '2025',
    excerpt: 'Film and stills built around a brand truth, not a shot list.',
    cover: '/old phone.png',
    services: ['Film', 'Photography', 'Post Production'],
    body: [
      'We treated production as storytelling rather than asset generation: cast, location and edit all argue the same point.',
      'The library it produced still carries the brand two seasons later.'
    ],
    sortOrder: 3
  }
];

const seedProjects = async () => {
  for (const project of PROJECTS) {
    const [record, created] = await Project.findOrCreate({
      where: { slug: project.slug },
      defaults: { ...project, isPublished: true }
    });

    console.log(
      created
        ? `[seed] project created: ${record.title}`
        : `[seed] project exists: ${record.title}`
    );
  }
};


const ARTICLES = [
  {
    slug: 'a-brand-without-a-point-of-view-is-decoration',
    title: 'A brand without a point of view is decoration',
    excerpt:
      'Most rebrands change how a company looks without changing what it argues. That is why they stop working within a season.',
    coverImage: '/oldphonebg.png',
    coverAlt: 'A rotary telephone on a warm neutral ground',
    category: 'insight',
    tags: ['strategy', 'positioning', 'branding'],
    content: [
      'A logo is the last decision, not the first. Before a mark means anything it has to stand for a position someone could disagree with — and most brands never get that far.',
      'The test we use is simple: can the team say, in one sentence, what the brand believes that a competitor would refuse to say? If the sentence survives that, the identity has something to carry. If it does not, the design work is decoration and it will be redone in eighteen months.',
      'Positioning is not a tagline. It is the argument that decides what the brand does next — which clients to take, which products to kill, which channels to ignore. That is why it comes first, and why it belongs to the founders rather than the design team.'
    ].join('\n\n')
  },
  {
    slug: 'what-a-brand-system-has-to-survive',
    title: 'What a brand system has to survive',
    excerpt:
      'Guidelines fail in the places nobody designs for: a 40px avatar, a partner lockup, a market you had not planned on.',
    coverImage: '/old phone.png',
    coverAlt: 'A vintage telephone handset, closely cropped',
    category: 'guide',
    tags: ['identity', 'design systems'],
    content: [
      'An identity is tested at its edges, not in the pitch deck. The hero lockup always looks good. What matters is the 40-pixel avatar, the co-branded lockup with a partner whose logo is louder than yours, and the market that reads right to left.',
      'So we design the constraints first: the smallest legible size, the one-colour version, the behaviour when the name has to sit beside somebody else. A system that answers those is one a team can run without calling us.',
      'The measure of a good brand book is how rarely anyone needs to ask a question that is not in it.'
    ].join('\n\n')
  },
  {
    slug: 'production-is-an-argument-not-an-asset-list',
    title: 'Production is an argument, not an asset list',
    excerpt:
      'Campaigns fail when the shoot is briefed as a quantity of deliverables rather than a thing the brand is trying to prove.',
    coverImage: '/droped phone.png',
    coverAlt: 'A telephone handset hanging from its cord',
    category: 'case-note',
    tags: ['production', 'campaign', 'film'],
    content: [
      'The brief that asks for "six films and forty stills" has already lost. Quantity is a budgeting question; it is not a creative one, and it produces libraries nobody uses.',
      'We start from the claim instead. What is the one thing this campaign has to make somebody believe? Cast, location, edit and grade then all argue the same point, and the asset count falls out of the answer rather than driving it.',
      'The libraries built that way keep working two seasons later, because they were never a pile of content — they were evidence.'
    ].join('\n\n')
  }
];

const seedArticles = async () => {
  for (const article of ARTICLES) {
    const [record, created] = await Article.findOrCreate({
      where: { slug: article.slug },
      defaults: {
        ...article,
        author: 'EAST HOOD',
        isPublished: true,
        publishedAt: new Date()
      }
    });

    console.log(
      created
        ? `[seed] article created: ${record.title}`
        : `[seed] article exists: ${record.title}`
    );
  }
};

const run = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    await seedAdmin();
    await seedServices();
    await seedPackages();
    await seedProjects();
    await seedArticles();

    if (!env.isProduction) {
      console.log('');
      console.log('  ────────────────────────────────────────────');
      console.log('   SIGN IN AT  /admin/login');
      console.log(`   EMAIL       ${DEV_ADMIN.email}`);
      console.log(`   PASSWORD    ${DEV_ADMIN.password}`);
      console.log('  ────────────────────────────────────────────');
      console.log('   Development credential, hard-coded in');
      console.log('   src/database/seed.js. Change it before launch.');
      console.log('  ────────────────────────────────────────────');
      console.log('');
    }

    console.log('[seed] done.');
    process.exit(0);
  } catch (error) {
    console.error('[seed] failed:', error.message);
    process.exit(1);
  }
};

run();
