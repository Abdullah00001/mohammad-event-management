const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const defaultContent = 'Default content. Please update this via the admin panel.';

async function main() {
  console.log('Seeding legal content...');

  // 1. Privacy Policy
  const privacyCount = await prisma.privacyPolicy.count();
  if (privacyCount === 0) {
    await prisma.privacyPolicy.create({ data: { content: defaultContent } });
    console.log('Created initial Privacy Policy.');
  }

  // 2. Terms and Condition
  const termsCount = await prisma.termsAndCondition.count();
  if (termsCount === 0) {
    await prisma.termsAndCondition.create({ data: { content: defaultContent } });
    console.log('Created initial Terms and Condition.');
  }

  // 3. About Us
  const aboutCount = await prisma.aboutUs.count();
  if (aboutCount === 0) {
    await prisma.aboutUs.create({ data: { content: defaultContent } });
    console.log('Created initial About Us.');
  }

  // 4. Subscription and Refund Policy
  const subCount = await prisma.subscriptionAndRefundPolicy.count();
  if (subCount === 0) {
    await prisma.subscriptionAndRefundPolicy.create({ data: { content: defaultContent } });
    console.log('Created initial Subscription and Refund Policy.');
  }

  // 5. Contact and Support
  const contactCount = await prisma.contactAndSupport.count();
  if (contactCount === 0) {
    await prisma.contactAndSupport.create({ data: { content: defaultContent } });
    console.log('Created initial Contact and Support.');
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
