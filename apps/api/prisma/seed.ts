import * as argon2 from 'argon2';
import { PrismaClient, RoleName, VerificationStatus, FaceMatchStatus, UserStatus, AssetCondition, AssetStatus, CategoryStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/toolshare?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedRolesAndPermissions() {
  const permissions = [
    ['users.manage', 'Manage user accounts and moderation'],
    ['roles.assign', 'Assign platform roles'],
    ['categories.manage', 'Create and update categories'],
    ['assets.moderate', 'Moderate asset listings'],
    ['kyc.review', 'Review identity verification requests'],
    ['system-configs.manage', 'Manage marketplace finance and system rules'],
    ['audit.read', 'View audit history'],
    ['dashboard.read', 'View platform dashboard'],
  ] as const;

  for (const [code, description] of permissions) {
    await prisma.permission.upsert({
      where: { code },
      update: { description },
      create: { code, description },
    });
  }

  const roleDefinitions: Array<{
    name: RoleName;
    description: string;
    permissionCodes: string[];
  }> = [
    { name: RoleName.USER, description: 'Verified marketplace participant', permissionCodes: [] },
    { name: RoleName.MODERATOR, description: 'Moderates listings and content', permissionCodes: ['assets.moderate', 'dashboard.read'] },
    { name: RoleName.CUSTOMER_SUPPORT, description: 'Supports rentals and users', permissionCodes: ['dashboard.read'] },
    { name: RoleName.DISPUTE_OFFICER, description: 'Handles dispute evidence and decisions', permissionCodes: ['dashboard.read'] },
    {
      name: RoleName.ADMIN,
      description: 'Manages day-to-day operations',
      permissionCodes: ['users.manage', 'categories.manage', 'assets.moderate', 'kyc.review', 'system-configs.manage', 'audit.read', 'dashboard.read'],
    },
    {
      name: RoleName.SUPER_ADMIN,
      description: 'Full platform control',
      permissionCodes: permissions.map(([code]) => code),
    },
  ];

  for (const roleDefinition of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { name: roleDefinition.name },
      update: { description: roleDefinition.description },
      create: {
        name: roleDefinition.name,
        description: roleDefinition.description,
      },
    });

    for (const permissionCode of roleDefinition.permissionCodes) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { code: permissionCode },
      });

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }
}

async function seedSystemConfigs() {
  const configs = [
    ['platform_fee_percent', '5', 'Fee percentage charged to the renter'],
    ['owner_commission_percent', '10', 'Commission percentage withheld from owner payout'],
    ['late_fee_rate', '10000', 'Late fee charged per overdue hour in VND'],
    ['max_new_user_asset_value', '3000000', 'Maximum asset value a newly verified user can rent'],
    ['risk_new_account_days', '30', 'Account age threshold in days for high-risk checks'],
    ['risk_cancel_threshold', '3', 'Cancellation count threshold for renter risk checks'],
    ['risk_cancel_lookback_days', '30', 'Lookback window in days for renter cancellation risk'],
    ['renter_cancel_full_refund_hours', '24', 'Renter receives full refund if cancelling before this many hours'],
    ['renter_cancel_partial_refund_percent', '50', 'Refund percentage when renter cancels close to start time'],
    ['owner_cancel_trust_penalty', '10', 'Trust score penalty applied when owner cancels a booking'],
    ['review_edit_hours', '24', 'How long a review remains editable'],
    ['contract_version', 'v1', 'Current rental contract version'],
  ] as const;

  for (const [key, value, description] of configs) {
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });
  }
}

async function seedCategories() {
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: { name: 'Electronics', status: CategoryStatus.ACTIVE },
    create: { name: 'Electronics', slug: 'electronics', status: CategoryStatus.ACTIVE },
  });

  const tools = await prisma.category.upsert({
    where: { slug: 'tools' },
    update: { name: 'Tools', status: CategoryStatus.ACTIVE },
    create: { name: 'Tools', slug: 'tools', status: CategoryStatus.ACTIVE },
  });

  const categorySeeds = [
    { slug: 'camera', name: 'Camera', parentId: electronics.id },
    { slug: 'projector', name: 'Projector', parentId: electronics.id },
    { slug: 'speaker', name: 'Speaker', parentId: electronics.id },
    { slug: 'drill', name: 'Drill', parentId: tools.id },
    { slug: 'saw', name: 'Saw', parentId: tools.id },
    { slug: 'measuring-tool', name: 'Measuring Tool', parentId: tools.id },
  ];

  for (const category of categorySeeds) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        parentId: category.parentId,
        status: CategoryStatus.ACTIVE,
      },
      create: {
        name: category.name,
        slug: category.slug,
        parentId: category.parentId,
        status: CategoryStatus.ACTIVE,
      },
    });
  }
}

async function seedRiskRules() {
  const rules = [
    ['weapon', 'Potential weapon listing requires manual review', 'General'],
    ['prescription', 'Prescription medicine listings are prohibited', 'Healthcare'],
    ['counterfeit', 'Counterfeit goods are prohibited', 'General'],
    ['cccd', 'Personal identity documents cannot be listed', 'Documents'],
  ] as const;

  for (const [keyword, reason, categoryHint] of rules) {
    await prisma.prohibitedAssetRule.upsert({
      where: { id: `seed-rule-${keyword}` },
      update: {
        keyword,
        reason,
        categoryHint,
        isActive: true,
      },
      create: {
        id: `seed-rule-${keyword}`,
        keyword,
        reason,
        categoryHint,
        isActive: true,
      },
    });
  }
}

async function seedUsersAndAssets() {
  const passwordHash = await argon2.hash('Admin@123456', { type: argon2.argon2id });
  const userPasswordHash = await argon2.hash('User@123456', { type: argon2.argon2id });

  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.SUPER_ADMIN } });
  const userRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.USER } });

  // 2 Admins
  const admins = [];
  for (let i = 1; i <= 2; i++) {
    const admin = await prisma.user.upsert({
      where: { email: `admin${i}@toolshare.local` },
      update: {},
      create: {
        email: `admin${i}@toolshare.local`,
        phone: `090000001${i}`,
        passwordHash,
        fullName: `ToolShare Admin ${i}`,
        status: UserStatus.ACTIVE,
        trustScore: 100,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
      },
    });
    admins.push(admin);
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
      update: {}, create: { userId: admin.id, roleId: superAdminRole.id }
    });
  }

  // 5 Users
  const users = [];
  for (let i = 1; i <= 5; i++) {
    const user = await prisma.user.upsert({
      where: { email: `user${i}@toolshare.local` },
      update: {},
      create: {
        email: `user${i}@toolshare.local`,
        phone: `090000002${i}`,
        passwordHash: userPasswordHash,
        fullName: `Demo User ${i}`,
        status: UserStatus.ACTIVE,
        trustScore: 80 + i,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
      },
    });
    users.push(user);
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: userRole.id } },
      update: {}, create: { userId: user.id, roleId: userRole.id }
    });
    await prisma.userVerification.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        provider: 'mock-kyc',
        verificationStatus: VerificationStatus.VERIFIED,
        documentType: 'CCCD',
        maskedDocumentNumber: '********1234',
        nameVerified: true,
        dateOfBirthVerified: true,
        faceMatchStatus: FaceMatchStatus.MATCHED,
        verifiedAt: new Date(),
      },
    });
  }

  const cameraCategory = await prisma.category.findUniqueOrThrow({ where: { slug: 'camera' } });

  // 20 Assets
  const assets = [];
  for (let i = 1; i <= 20; i++) {
    const owner = users[i % 5];
    const asset = await prisma.asset.upsert({
      where: { id: `cm-toolshare-demo-asset-${i}` },
      update: {},
      create: {
        id: `cm-toolshare-demo-asset-${i}`,
        ownerId: owner.id,
        categoryId: cameraCategory.id,
        title: `Thiết bị Demo ${i}`,
        description: `Mô tả cho thiết bị demo số ${i} dành cho việc test.`,
        brand: i % 2 === 0 ? 'Canon' : 'Sony',
        model: `Model X${i}`,
        serialNumber: `TS-DEMO-${i}`,
        condition: AssetCondition.GOOD,
        estimatedValue: 15000000 + i * 1000000,
        pricePerDay: 200000 + i * 10000,
        minimumDurationDays: 1,
        maximumDurationDays: 14,
        city: 'TP.HCM',
        district: 'Thu Duc',
        ward: 'Linh Tay',
        status: AssetStatus.ACTIVE,
        deliveryOptions: ['meetup'],
      },
    });
    assets.push(asset);
    
    await prisma.assetImage.upsert({
      where: { id: `cm-toolshare-demo-asset-image-${i}` },
      update: {},
      create: {
        id: `cm-toolshare-demo-asset-image-${i}`,
        assetId: asset.id,
        url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800&auto=format&fit=crop',
        sortOrder: 0,
        isCover: true,
      },
    });
  }

  // A few Bookings
  const renter = users[0];
  const owner = users[1];
  const rentedAsset = assets.find(a => a.ownerId === owner.id);
  
  if (rentedAsset) {
    const startAt = new Date();
    startAt.setDate(startAt.getDate() + 1);
    const endAt = new Date();
    endAt.setDate(endAt.getDate() + 3);

    await prisma.rentalRequest.upsert({
      where: { id: 'demo-booking-1' },
      update: {},
      create: {
        id: 'demo-booking-1',
        assetId: rentedAsset.id,
        ownerId: owner.id,
        renterId: renter.id,
        startAt,
        endAt,
        status: 'CONFIRMED',
        rentalFee: 500000,
        serviceFee: 25000,
        totalAmount: 525000,
      }
    });
  }
}

async function main() {
  await seedRolesAndPermissions();
  await seedSystemConfigs();
  await seedCategories();
  await seedRiskRules();
  await seedUsersAndAssets();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
