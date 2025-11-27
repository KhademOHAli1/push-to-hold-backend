import { PrismaClient, DemocracyStatus, EvidenceType, PledgeStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ============================================
  // 1. Create Pledges (Democracy Pledge versions)
  // ============================================
  console.log('Creating pledges...');
  
  const pledge1 = await prisma.pledge.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      version: '1.0',
      title: 'Democracy Pledge v1.0',
      bodyMarkdown: `
# Democracy Pledge

We commit to:

1. **Uphold democratic values** in all business activities
2. **No cooperation** with parties or organisations officially classified as extremist or anti-constitutional
3. **Transparency** in political donations and lobbying activities
4. **Address concerns** promptly if any conflicts are identified

Signed by authorized company representative.
      `.trim(),
      isActive: true,
    },
  });
  console.log(`  ✅ Created pledge: ${pledge1.title}`);

  // ============================================
  // 2. Create Question Templates
  // ============================================
  console.log('\nCreating question templates...');

  const questions = [
    { code: 'stance_on_extremist_cooperation', text: 'Do you cooperate with parties or organisations officially classified as extremist?' },
    { code: 'political_donations', text: 'Do you disclose your political donations publicly?' },
    { code: 'lobbying_transparency', text: 'Are your lobbying activities registered in the EU Transparency Register?' },
  ];

  for (const q of questions) {
    await prisma.questionTemplate.upsert({
      where: { code: q.code },
      update: {},
      create: q,
    });
    console.log(`  ✅ Created question: ${q.code}`);
  }

  // ============================================
  // 3. Create Companies with different statuses
  // ============================================
  console.log('\nCreating companies...');

  // GREEN company - signed pledge, no conflicts
  const companyGreen = await prisma.company.upsert({
    where: { id: '10000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000001',
      officialName: 'BioFair GmbH & Co. KG',
      displayName: 'BioFair',
      countryCode: 'DE',
      sector: 'Food & Beverage',
      sizeBracket: 'large',
      websiteUrl: 'https://biofair.de',
      democracyStatus: DemocracyStatus.green,
      democracyScore: 92,
      statusReasonShort: 'Signed democracy pledge v1.0, no conflicts found.',
      lastReviewAt: new Date('2025-04-01'),
    },
  });
  console.log(`  ✅ Created GREEN company: ${companyGreen.displayName}`);

  // YELLOW company - no pledge, unclear stance
  const companyYellow = await prisma.company.upsert({
    where: { id: '10000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000002',
      officialName: 'MegaCorp Deutschland AG',
      displayName: 'MegaCorp',
      countryCode: 'DE',
      sector: 'Consumer Goods',
      sizeBracket: 'large',
      websiteUrl: 'https://megacorp.de',
      democracyStatus: DemocracyStatus.yellow,
      democracyScore: 50,
      statusReasonShort: 'No pledge signed yet. No public commitment or conflict found.',
      lastReviewAt: new Date('2025-03-15'),
    },
  });
  console.log(`  ✅ Created YELLOW company: ${companyYellow.displayName}`);

  // RED company - documented conflicts
  const companyRed = await prisma.company.upsert({
    where: { id: '10000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000003',
      officialName: 'Konflikt Industries GmbH',
      displayName: 'Konflikt Industries',
      countryCode: 'DE',
      sector: 'Manufacturing',
      sizeBracket: 'SME',
      websiteUrl: 'https://konflikt-ind.de',
      democracyStatus: DemocracyStatus.red,
      democracyScore: 15,
      statusReasonShort: 'Documented cooperation with organisation classified as extremist.',
      lastReviewAt: new Date('2025-04-10'),
    },
  });
  console.log(`  ✅ Created RED company: ${companyRed.displayName}`);

  // Additional companies for variety
  const additionalCompanies = [
    {
      id: '10000000-0000-0000-0000-000000000004',
      officialName: 'Naturkost Müller GmbH',
      displayName: 'Naturkost Müller',
      countryCode: 'DE',
      sector: 'Food & Beverage',
      sizeBracket: 'SME',
      democracyStatus: DemocracyStatus.green,
      democracyScore: 88,
      statusReasonShort: 'Signed pledge, active in democratic business alliance.',
    },
    {
      id: '10000000-0000-0000-0000-000000000005',
      officialName: 'Drogerie Wellness AG',
      displayName: 'Wellness Drogerie',
      countryCode: 'DE',
      sector: 'Personal Care',
      sizeBracket: 'large',
      democracyStatus: DemocracyStatus.yellow,
      democracyScore: 55,
      statusReasonShort: 'Under review, awaiting response to questionnaire.',
    },
  ];

  for (const c of additionalCompanies) {
    await prisma.company.upsert({
      where: { id: c.id },
      update: {},
      create: c as any,
    });
    console.log(`  ✅ Created ${c.democracyStatus.toUpperCase()} company: ${c.displayName}`);
  }

  // ============================================
  // 4. Create Brands
  // ============================================
  console.log('\nCreating brands...');

  const brands = [
    { id: '20000000-0000-0000-0000-000000000001', name: 'BioFair Naturprodukte', companyId: companyGreen.id },
    { id: '20000000-0000-0000-0000-000000000002', name: 'BioFair Kids', companyId: companyGreen.id },
    { id: '20000000-0000-0000-0000-000000000003', name: 'MegaSnack', companyId: companyYellow.id },
    { id: '20000000-0000-0000-0000-000000000004', name: 'MegaDrink', companyId: companyYellow.id },
    { id: '20000000-0000-0000-0000-000000000005', name: 'Konflikt Basics', companyId: companyRed.id },
    { id: '20000000-0000-0000-0000-000000000006', name: 'Naturkost Bio', companyId: '10000000-0000-0000-0000-000000000004' },
    { id: '20000000-0000-0000-0000-000000000007', name: 'Wellness Care', companyId: '10000000-0000-0000-0000-000000000005' },
  ];

  for (const b of brands) {
    await prisma.brand.upsert({
      where: { id: b.id },
      update: {},
      create: b,
    });
    console.log(`  ✅ Created brand: ${b.name}`);
  }

  // ============================================
  // 5. Create Products (with GTINs)
  // ============================================
  console.log('\nCreating products...');

  const products = [
    // BioFair products (GREEN)
    { gtin: '4001234567890', name: 'Bio Joghurt Natur 500g', brandId: brands[0].id, category: 'Dairy', sourceSystem: 'openfoodfacts' },
    { gtin: '4001234567891', name: 'Bio Vollmilch 1L', brandId: brands[0].id, category: 'Dairy', sourceSystem: 'openfoodfacts' },
    { gtin: '4001234567892', name: 'Bio Kindermüsli 300g', brandId: brands[1].id, category: 'Cereals', sourceSystem: 'openfoodfacts' },
    
    // MegaCorp products (YELLOW)
    { gtin: '4002345678901', name: 'MegaSnack Chips Classic 200g', brandId: brands[2].id, category: 'Snacks', sourceSystem: 'openfoodfacts' },
    { gtin: '4002345678902', name: 'MegaDrink Cola 1.5L', brandId: brands[3].id, category: 'Beverages', sourceSystem: 'openfoodfacts' },
    
    // Konflikt products (RED)
    { gtin: '4003456789012', name: 'Konflikt Seife 100g', brandId: brands[4].id, category: 'Personal Care', sourceSystem: 'openproductfacts' },
    
    // Naturkost products (GREEN)
    { gtin: '4004567890123', name: 'Bio Apfelsaft 1L', brandId: brands[5].id, category: 'Beverages', sourceSystem: 'openfoodfacts' },
    
    // Wellness products (YELLOW)
    { gtin: '4005678901234', name: 'Wellness Shampoo 250ml', brandId: brands[6].id, category: 'Personal Care', sourceSystem: 'openproductfacts' },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { gtin: p.gtin },
      update: {},
      create: p,
    });
    console.log(`  ✅ Created product: ${p.name} (${p.gtin})`);
  }

  // ============================================
  // 6. Create Company Pledges
  // ============================================
  console.log('\nCreating company pledges...');

  await prisma.companyPledge.upsert({
    where: { id: '30000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '30000000-0000-0000-0000-000000000001',
      companyId: companyGreen.id,
      pledgeId: pledge1.id,
      status: PledgeStatus.approved,
      signedAt: new Date('2025-03-21'),
      approvedAt: new Date('2025-03-22'),
      signatoryName: 'Dr. Maria Schmidt',
      signatoryRole: 'Geschäftsführerin',
    },
  });
  console.log(`  ✅ Created pledge signature for ${companyGreen.displayName}`);

  await prisma.companyPledge.upsert({
    where: { id: '30000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '30000000-0000-0000-0000-000000000002',
      companyId: '10000000-0000-0000-0000-000000000004',
      pledgeId: pledge1.id,
      status: PledgeStatus.approved,
      signedAt: new Date('2025-02-15'),
      approvedAt: new Date('2025-02-16'),
      signatoryName: 'Hans Müller',
      signatoryRole: 'Inhaber',
    },
  });
  console.log(`  ✅ Created pledge signature for Naturkost Müller`);

  // ============================================
  // 7. Create Evidence
  // ============================================
  console.log('\nCreating evidence...');

  const evidenceItems = [
    // GREEN company evidence
    {
      id: '40000000-0000-0000-0000-000000000001',
      companyId: companyGreen.id,
      type: EvidenceType.pledge,
      title: 'Signed Democracy Pledge v1.0',
      sourceUrl: 'https://pushtohold.de/pledges/biofair',
      sourceName: 'Push to Hold',
      sourceDate: new Date('2025-03-21'),
      impact: 20,
      notesMarkdown: 'CEO signed pledge at company board meeting.',
    },
    {
      id: '40000000-0000-0000-0000-000000000002',
      companyId: companyGreen.id,
      type: EvidenceType.association_membership,
      title: 'Member of Alliance for Democratic Business',
      sourceUrl: 'https://demokratie-wirtschaft.de/members',
      sourceName: 'Allianz für Demokratie in der Wirtschaft',
      sourceDate: new Date('2024-11-01'),
      impact: 10,
      notesMarkdown: 'Active member since 2024.',
    },
    // YELLOW company evidence
    {
      id: '40000000-0000-0000-0000-000000000003',
      companyId: companyYellow.id,
      type: EvidenceType.company_statement,
      title: 'General values statement on website',
      sourceUrl: 'https://megacorp.de/about/values',
      sourceName: 'MegaCorp Website',
      sourceDate: new Date('2023-01-15'),
      impact: 5,
      notesMarkdown: 'Generic CSR statement, no specific democracy commitment.',
    },
    // RED company evidence
    {
      id: '40000000-0000-0000-0000-000000000004',
      companyId: companyRed.id,
      type: EvidenceType.news_article,
      title: 'CEO attended extremist-linked event',
      sourceUrl: 'https://example-news.de/article/12345',
      sourceName: 'Tagesschau',
      sourceDate: new Date('2025-01-15'),
      impact: -25,
      notesMarkdown: 'CEO photographed at event organized by group classified as extremist by Verfassungsschutz.',
    },
    {
      id: '40000000-0000-0000-0000-000000000005',
      companyId: companyRed.id,
      type: EvidenceType.donation_record,
      title: 'Donation to extremist-adjacent foundation',
      sourceUrl: 'https://lobbyregister.de/entry/xyz',
      sourceName: 'Lobbyregister',
      sourceDate: new Date('2024-09-20'),
      impact: -20,
      notesMarkdown: 'Documented donation of €50,000 to foundation with documented extremist ties.',
    },
  ];

  for (const e of evidenceItems) {
    await prisma.companyEvidence.upsert({
      where: { id: e.id },
      update: {},
      create: e as any,
    });
    console.log(`  ✅ Created evidence: ${e.title}`);
  }

  // ============================================
  // Summary
  // ============================================
  console.log('\n✅ Seeding complete!\n');
  console.log('Summary:');
  console.log(`  - Pledges: ${await prisma.pledge.count()}`);
  console.log(`  - Companies: ${await prisma.company.count()}`);
  console.log(`  - Brands: ${await prisma.brand.count()}`);
  console.log(`  - Products: ${await prisma.product.count()}`);
  console.log(`  - Company Pledges: ${await prisma.companyPledge.count()}`);
  console.log(`  - Evidence Items: ${await prisma.companyEvidence.count()}`);
  console.log(`  - Question Templates: ${await prisma.questionTemplate.count()}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
