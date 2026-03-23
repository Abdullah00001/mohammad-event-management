const { PrismaClient } = require('@prisma/client');
require('dotenv').config({
  path: require('path').join(__dirname, '..', '.env'),
});
const readline = require('readline');

const prisma = new PrismaClient();

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

const seedFeature = async () => {
  try {
    await prisma.$connect();
    console.log('✓ Connected to PostgreSQL\n');
    console.log('Add Subscription Feature');
    console.log('------------------------\n');

    // --- Feature Title ---
    let featureTitle = '';
    while (!featureTitle || featureTitle.length < 3) {
      featureTitle = await question('Feature Title (e.g. Travel Mode): ');
      if (!featureTitle) {
        console.log('⚠ Feature title cannot be empty!');
      } else if (featureTitle.length < 3) {
        console.log('⚠ Feature title must be at least 3 characters!');
        featureTitle = '';
      }
    }

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
      console.log(`  Title:    ${existing.featureTitle}`);
      console.log(`  Active:   ${existing.isActive}`);
      console.log(
        `  Created:  ${existing.createdAt.toISOString().split('T')[0]}`
      );

      const overwrite = await question(
        '\nUpdate the title for this key? (y/N): '
      );
      if (overwrite.trim().toLowerCase() !== 'y') {
        console.log('\n✗ Aborted. No changes made.');
        rl.close();
        await prisma.$disconnect();
        process.exit(0);
      }

      const updated = await prisma.subscriptionFeature.update({
        where: { featureKey },
        data: { featureTitle },
      });

      console.log(`\n✓ Feature updated successfully!`);
      console.log(`  Key:   ${updated.featureKey}`);
      console.log(`  Title: ${updated.featureTitle}`);

      rl.close();
      await prisma.$disconnect();
      process.exit(0);
    }

    // --- Confirm before saving ---
    console.log('\n--- Review ---');
    console.log(`  Key:   ${featureKey}`);
    console.log(`  Title: ${featureTitle}`);
    const confirm = await question('\nSave this feature? (Y/n): ');
    if (confirm.trim().toLowerCase() === 'n') {
      console.log('\n✗ Aborted. No changes made.');
      rl.close();
      await prisma.$disconnect();
      process.exit(0);
    }

    // --- Save ---
    const feature = await prisma.subscriptionFeature.create({
      data: {
        featureKey,
        featureTitle,
        isActive: true,
      },
    });

    console.log('\n✓ Feature created successfully!');
    console.log(`  ID:    ${feature.id}`);
    console.log(`  Key:   ${feature.featureKey}`);
    console.log(`  Title: ${feature.featureTitle}`);

    rl.close();
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    rl.close();
    await prisma.$disconnect();
    process.exit(1);
  }
};

seedFeature();
