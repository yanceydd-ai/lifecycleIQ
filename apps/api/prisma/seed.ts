import { PrismaClient } from '@prisma/client';
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

  console.log('Seed complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
