import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Phase 1 data...');

  const departments = await Promise.all([
    prisma.department.upsert({
      where: { id: 'dept-it-000000000000' },
      update: {},
      create: { id: 'dept-it-000000000000', name: 'Information Technology', budgetCode: 'IT-001' },
    }),
    prisma.department.upsert({
      where: { id: 'dept-fi-000000000000' },
      update: {},
      create: { id: 'dept-fi-000000000000', name: 'Finance', budgetCode: 'FIN-001' },
    }),
    prisma.department.upsert({
      where: { id: 'dept-op-000000000000' },
      update: {},
      create: { id: 'dept-op-000000000000', name: 'Operations', budgetCode: 'OPS-001' },
    }),
    prisma.department.upsert({
      where: { id: 'dept-hr-000000000000' },
      update: {},
      create: { id: 'dept-hr-000000000000', name: 'Human Resources', budgetCode: 'HR-001' },
    }),
    prisma.department.upsert({
      where: { id: 'dept-ad-000000000000' },
      update: {},
      create: { id: 'dept-ad-000000000000', name: 'Administration', budgetCode: 'ADM-001' },
    }),
  ]);
  console.log(`Created ${departments.length} departments`);

  const locations = await Promise.all([
    prisma.location.upsert({
      where: { id: 'loc-main-00000000000' },
      update: {},
      create: { id: 'loc-main-00000000000', name: 'Main Building', building: 'Main', locationType: 'office' },
    }),
    prisma.location.upsert({
      where: { id: 'loc-annx-00000000000' },
      update: {},
      create: { id: 'loc-annx-00000000000', name: 'Annex', building: 'Annex', locationType: 'office' },
    }),
    prisma.location.upsert({
      where: { id: 'loc-dc-0000000000000' },
      update: {},
      create: { id: 'loc-dc-0000000000000', name: 'Data Center', building: 'Main', room: 'B001', locationType: 'datacenter' },
    }),
    prisma.location.upsert({
      where: { id: 'loc-rem-0000000000000' },
      update: {},
      create: { id: 'loc-rem-0000000000000', name: 'Remote', locationType: 'remote' },
    }),
    prisma.location.upsert({
      where: { id: 'loc-wh-00000000000000' },
      update: {},
      create: { id: 'loc-wh-00000000000000', name: 'Warehouse', building: 'Warehouse', locationType: 'warehouse' },
    }),
  ]);
  console.log(`Created ${locations.length} locations`);

  const vendors = await Promise.all([
    prisma.vendor.upsert({ where: { id: 'vnd-ms-000000000000' }, update: {}, create: { id: 'vnd-ms-000000000000', name: 'Microsoft', website: 'https://microsoft.com', supportEmail: 'support@microsoft.com' } }),
    prisma.vendor.upsert({ where: { id: 'vnd-ap-000000000000' }, update: {}, create: { id: 'vnd-ap-000000000000', name: 'Apple', website: 'https://apple.com' } }),
    prisma.vendor.upsert({ where: { id: 'vnd-dl-000000000000' }, update: {}, create: { id: 'vnd-dl-000000000000', name: 'Dell Technologies', website: 'https://dell.com' } }),
    prisma.vendor.upsert({ where: { id: 'vnd-cs-000000000000' }, update: {}, create: { id: 'vnd-cs-000000000000', name: 'Cisco', website: 'https://cisco.com' } }),
    prisma.vendor.upsert({ where: { id: 'vnd-goo-0000000000' }, update: {}, create: { id: 'vnd-goo-0000000000', name: 'Google', website: 'https://google.com' } }),
    prisma.vendor.upsert({ where: { id: 'vnd-aws-0000000000' }, update: {}, create: { id: 'vnd-aws-0000000000', name: 'Amazon Web Services', website: 'https://aws.amazon.com' } }),
    prisma.vendor.upsert({ where: { id: 'vnd-len-0000000000' }, update: {}, create: { id: 'vnd-len-0000000000', name: 'Lenovo', website: 'https://lenovo.com' } }),
    prisma.vendor.upsert({ where: { id: 'vnd-hpe-0000000000' }, update: {}, create: { id: 'vnd-hpe-0000000000', name: 'HPE', website: 'https://hpe.com' } }),
    prisma.vendor.upsert({ where: { id: 'vnd-zmr-0000000000' }, update: {}, create: { id: 'vnd-zmr-0000000000', name: 'Zoom', website: 'https://zoom.us' } }),
    prisma.vendor.upsert({ where: { id: 'vnd-sal-0000000000' }, update: {}, create: { id: 'vnd-sal-0000000000', name: 'Salesforce', website: 'https://salesforce.com' } }),
  ]);
  console.log(`Created ${vendors.length} vendors`);

  const adminHash = await bcrypt.hash('Admin1234!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lifecycleiq.local' },
    update: {},
    create: {
      email: 'admin@lifecycleiq.local',
      displayName: 'System Admin',
      passwordHash: adminHash,
      role: 'admin',
      departmentId: 'dept-it-000000000000',
      isActive: true,
    },
  });
  console.log(`Admin user: ${admin.email} (password: Admin1234!)`);

  console.log('Seeding Phase 2a data...');

  const hardwareAssets = await Promise.all([
    prisma.hardwareAsset.upsert({
      where: { id: 'hw-seed-1' },
      update: {},
      create: {
        id: 'hw-seed-1',
        assetTag: 'HW-001',
        assetType: 'laptop',
        purchaseDate: new Date('2022-01-15'),
        usefulLifeYears: 4,
        warrantyEndDate: new Date('2025-01-15'),
        purchaseCost: new Decimal('1200.00'),
        lifecycleStatus: 'active',
        criticality: 'medium',
        departmentId: 'dept-it-000000000000',
      },
    }),
    prisma.hardwareAsset.upsert({
      where: { id: 'hw-seed-2' },
      update: {},
      create: {
        id: 'hw-seed-2',
        assetTag: 'HW-002',
        assetType: 'desktop',
        purchaseDate: new Date('2020-03-10'),
        usefulLifeYears: 5,
        supportEndDate: new Date('2025-03-10'),
        purchaseCost: new Decimal('950.00'),
        lifecycleStatus: 'active',
        criticality: 'mission_critical',
      },
    }),
    prisma.hardwareAsset.upsert({
      where: { id: 'hw-seed-3' },
      update: {},
      create: {
        id: 'hw-seed-3',
        assetTag: 'HW-003',
        assetType: 'network_switch',
        purchaseDate: new Date('2019-06-01'),
        usefulLifeYears: 7,
        purchaseCost: new Decimal('3500.00'),
        lifecycleStatus: 'active',
        criticality: 'mission_critical',
      },
    }),
  ]);
  console.log(`Created ${hardwareAssets.length} hardware assets`);

  const softwareProducts = await Promise.all([
    prisma.softwareProduct.upsert({
      where: { id: 'sw-seed-1' },
      update: {},
      create: {
        id: 'sw-seed-1',
        name: 'Microsoft 365',
        licenseModel: 'per_user',
        qtyPurchased: 50,
        qtyActivelyUsed: 42,
        unitCost: new Decimal('15.00'),
        annualCost: new Decimal('9000.00'),
        renewalDate: new Date('2026-12-31'),
        noticePeriodDays: 60,
        status: 'active',
        vendorId: 'vnd-ms-000000000000',
      },
    }),
    prisma.softwareProduct.upsert({
      where: { id: 'sw-seed-2' },
      update: {},
      create: {
        id: 'sw-seed-2',
        name: 'Adobe Creative Cloud',
        licenseModel: 'per_user',
        qtyPurchased: 10,
        qtyActivelyUsed: 3,
        unitCost: new Decimal('60.00'),
        annualCost: new Decimal('7200.00'),
        renewalDate: new Date('2026-09-30'),
        noticePeriodDays: 30,
        status: 'active',
        recommendedAction: 'renew_with_reduction',
      },
    }),
    prisma.softwareProduct.upsert({
      where: { id: 'sw-seed-3' },
      update: {},
      create: {
        id: 'sw-seed-3',
        name: 'GitHub Enterprise',
        licenseModel: 'site_license',
        qtyPurchased: 100,
        qtyActivelyUsed: 85,
        annualCost: new Decimal('21000.00'),
        renewalDate: new Date('2027-03-15'),
        noticePeriodDays: 90,
        status: 'active',
        vendorId: 'vnd-goo-0000000000',
      },
    }),
  ]);
  console.log(`Created ${softwareProducts.length} software products`);

  const contracts = await Promise.all([
    prisma.contract.upsert({
      where: { id: 'ct-seed-1' },
      update: {},
      create: {
        id: 'ct-seed-1',
        name: 'Microsoft EA',
        contractType: 'software_subscription',
        softwareProductId: 'sw-seed-1',
        endDate: new Date('2026-12-31'),
        noticePeriodDays: 60,
        autoRenewal: false,
        annualCost: new Decimal('9000.00'),
        approvalStatus: 'approved',
        vendorId: 'vnd-ms-000000000000',
      },
    }),
    prisma.contract.upsert({
      where: { id: 'ct-seed-2' },
      update: {},
      create: {
        id: 'ct-seed-2',
        name: 'Adobe Creative Cloud Contract',
        contractType: 'saas_agreement',
        softwareProductId: 'sw-seed-2',
        endDate: new Date('2026-09-30'),
        noticePeriodDays: 30,
        autoRenewal: true,
        annualCost: new Decimal('7200.00'),
        approvalStatus: 'approved',
      },
    }),
  ]);
  console.log(`Created ${contracts.length} contracts`);

  console.log('Seeded hardware assets, software products, and contracts');

  // Seed FiscalYearSettings singleton
  const existingFiscalSettings = await prisma.fiscalYearSettings.findFirst();
  if (!existingFiscalSettings) {
    await prisma.fiscalYearSettings.create({
      data: {
        fiscalYearStartMonth: 1,
        defaultEscalationRate: 0.03,
      },
    });
    console.log('Seeded FiscalYearSettings (Jan, 3% escalation)');
  }

  console.log('Seed complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
