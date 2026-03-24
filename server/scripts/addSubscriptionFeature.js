const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
require('dotenv').config({
  path: require('path').join(__dirname, '..', '.env'),
});
const readline = require('readline');

const prisma = new PrismaClient();

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  lazyConnect: true,
});

const CACHE_KEY = 'subscriptions:features';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

const toFeatureKey = (input) => {
  return input.trim().toUpperCase().replace(/\s+/g, '_');
};

const invalidateCache = async () => {
  const deleted = await redis.del(CACHE_KEY);
  if (deleted) {
    console.log(`  cache: "${CACHE_KEY}" invalidated`);
  } else {
    console.log(`  cache: "${CACHE_KEY}" was not cached — skipped`);
  }
};

const askOptionalDescription = async () => {
  while (true) {
    const input = (
      await question('Feature Description (optional, max 180 chars): ')
    ).trim();
    if (!input) return null;
    if (input.length < 10) {
      console.log('⚠ Description must be at least 10 characters if provided!');
      continue;
    }
    if (input.length > 180) {
      console.log(
        `⚠ Description too long — ${input.length}/180 chars used. Please shorten it.`
      );
      continue;
    }
    return input;
  }
};

const cleanup = async () => {
  rl.close();
  await redis.quit();
  await prisma.$disconnect();
};

const seedFeature = async () => {
  try {
    await prisma.$connect();
    await redis.connect();
    console.log('✓ Connected to PostgreSQL');
    console.log('✓ Connected to Redis\n');
    console.log('Add Subscription Feature');
    console.log('------------------------\n');

    // --- Feature Title (min 3, max 48) ---
    let featureTitle = '';
    while (!featureTitle) {
      const input = (await question('Feature Title (max 48 chars): ')).trim();
      if (!input) {
        console.log('⚠ Feature title cannot be empty!');
      } else if (input.length < 3) {
        console.log('⚠ Feature title must be at least 3 characters!');
      } else if (input.length > 48) {
        console.log(
          `⚠ Feature title too long — ${input.length}/48 chars used. Please shorten it.`
        );
      } else {
        featureTitle = input;
      }
    }

    // --- Feature Description (optional, max 180) ---
    const featureDescription = await askOptionalDescription();

    // --- Feature Key (auto-suggested, overridable) ---
    const suggested = toFeatureKey(featureTitle);
    console.log(`  Suggested key: ${suggested}`);
    const keyInput = await question(
      `Feature Key (press Enter to use suggested): `
    );
    const featureKey = keyInput.trim() ? toFeatureKey(keyInput) : suggested;

    // --- Check for duplicate ---
    const existing = await prisma.subscriptionFeature.findUnique({
      where: { featureKey },
    });

    if (existing) {
      console.log(`\n⚠ Feature key "${featureKey}" already exists.`);
      console.log(`  Title:       ${existing.featureTitle}`);
      console.log(`  Description: ${existing.featureDescription ?? '—'}`);
      console.log(`  Active:      ${existing.isActive}`);
      console.log(
        `  Created:     ${existing.createdAt.toISOString().split('T')[0]}`
      );

      const overwrite = await question(
        '\nUpdate title and description for this key? (y/N): '
      );
      if (overwrite.trim().toLowerCase() !== 'y') {
        console.log('\n✗ Aborted. No changes made.');
        await cleanup();
        process.exit(0);
      }

      const updated = await prisma.subscriptionFeature.update({
        where: { featureKey },
        data: { featureTitle, featureDescription },
      });

      await invalidateCache();

      console.log(`\n✓ Feature updated successfully!`);
      console.log(`  Key:         ${updated.featureKey}`);
      console.log(`  Title:       ${updated.featureTitle}`);
      console.log(`  Description: ${updated.featureDescription ?? '—'}`);

      await cleanup();
      process.exit(0);
    }

    // --- Confirm before saving ---
    console.log('\n--- Review ---');
    console.log(`  Key:         ${featureKey}`);
    console.log(`  Title:       ${featureTitle}`);
    console.log(`  Description: ${featureDescription ?? '—'}`);
    const confirm = await question('\nSave this feature? (Y/n): ');
    if (confirm.trim().toLowerCase() === 'n') {
      console.log('\n✗ Aborted. No changes made.');
      await cleanup();
      process.exit(0);
    }

    // --- Save ---
    const feature = await prisma.subscriptionFeature.create({
      data: {
        featureKey,
        featureTitle,
        featureDescription,
        isActive: true,
      },
    });

    await invalidateCache();

    console.log('\n✓ Feature created successfully!');
    console.log(`  ID:          ${feature.id}`);
    console.log(`  Key:         ${feature.featureKey}`);
    console.log(`  Title:       ${feature.featureTitle}`);
    console.log(`  Description: ${feature.featureDescription ?? '—'}`);

    await cleanup();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    await cleanup();
    process.exit(1);
  }
};

seedFeature();
