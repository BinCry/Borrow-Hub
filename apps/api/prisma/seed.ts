import argon2 from 'argon2';
import { PrismaClient, RoleName, VerificationStatus, FaceMatchStatus, UserStatus, AssetCondition, AssetStatus, CategoryStatus } from '@prisma/client';

const prisma = new PrismaClient();

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

  const admin = await prisma.user.upsert({
    where: { email: 'admin@toolshare.local' },
    update: {
      fullName: 'ToolShare Admin',
      phone: '0900000001',
      status: UserStatus.ACTIVE,
      passwordHash,
      trustScore: 100,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
    create: {
      email: 'admin@toolshare.local',
      phone: '0900000001',
      passwordHash,
      fullName: 'ToolShare Admin',
      status: UserStatus.ACTIVE,
      trustScore: 100,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });

  const demoOwner = await prisma.user.upsert({
    where: { email: 'owner@toolshare.local' },
    update: {
      fullName: 'Demo Owner',
      phone: '0900000002',
      status: UserStatus.ACTIVE,
      passwordHash: userPasswordHash,
      trustScore: 82,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
    create: {
      email: 'owner@toolshare.local',
      phone: '0900000002',
      passwordHash: userPasswordHash,
      fullName: 'Demo Owner',
      status: UserStatus.ACTIVE,
      trustScore: 82,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });

  const demoRenter = await prisma.user.upsert({
    where: { email: 'renter@toolshare.local' },
    update: {
      fullName: 'Demo Renter',
      phone: '0900000003',
      status: UserStatus.ACTIVE,
      passwordHash: userPasswordHash,
      trustScore: 68,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
    create: {
      email: 'renter@toolshare.local',
      phone: '0900000003',
      passwordHash: userPasswordHash,
      fullName: 'Demo Renter',
      status: UserStatus.ACTIVE,
      trustScore: 68,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });

  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: { name: RoleName.SUPER_ADMIN },
  });
  const userRole = await prisma.role.findUniqueOrThrow({
    where: { name: RoleName.USER },
  });

  for (const [userId, roleId] of [
    [admin.id, superAdminRole.id],
    [demoOwner.id, userRole.id],
    [demoRenter.id, userRole.id],
  ] as const) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
      update: {},
      create: { userId, roleId },
    });
  }

  for (const userId of [admin.id, demoOwner.id, demoRenter.id]) {
    await prisma.userVerification.upsert({
      where: { userId },
      update: {
        provider: 'mock-kyc',
        verificationStatus: VerificationStatus.VERIFIED,
        documentType: 'CCCD',
        maskedDocumentNumber: '********1234',
        nameVerified: true,
        dateOfBirthVerified: true,
        faceMatchStatus: FaceMatchStatus.MATCHED,
        verifiedAt: new Date(),
      },
      create: {
        userId,
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

  const cameraCategory = await prisma.category.findUniqueOrThrow({
    where: { slug: 'camera' },
  });

  const asset = await prisma.asset.upsert({
    where: { id: 'cm-toolshare-demo-asset' },
    update: {
      ownerId: demoOwner.id,
      categoryId: cameraCategory.id,
      title: 'Canon R50 Kit',
      description: 'Mirrorless camera package for short-term shooting and content creation.',
      brand: 'Canon',
      model: 'R50',
      serialNumber: 'TS-DEMO-R50',
      condition: AssetCondition.GOOD,
      estimatedValue: 20000000,
      pricePerDay: 300000,
      minimumDurationDays: 1,
      maximumDurationDays: 7,
      city: 'TP.HCM',
      district: 'Thu Duc',
      ward: 'Linh Tay',
      status: AssetStatus.ACTIVE,
      deliveryOptions: ['meetup', 'owner-dropoff'],
      usageInstructions: 'Use gently and avoid moisture exposure.',
      cancellationPolicy: 'Free cancellation up to 24 hours before pickup.',
    },
    create: {
      id: 'cm-toolshare-demo-asset',
      ownerId: demoOwner.id,
      categoryId: cameraCategory.id,
      title: 'Canon R50 Kit',
      description: 'Mirrorless camera package for short-term shooting and content creation.',
      brand: 'Canon',
      model: 'R50',
      serialNumber: 'TS-DEMO-R50',
      condition: AssetCondition.GOOD,
      estimatedValue: 20000000,
      pricePerDay: 300000,
      minimumDurationDays: 1,
      maximumDurationDays: 7,
      city: 'TP.HCM',
      district: 'Thu Duc',
      ward: 'Linh Tay',
      status: AssetStatus.ACTIVE,
      deliveryOptions: ['meetup', 'owner-dropoff'],
      usageInstructions: 'Use gently and avoid moisture exposure.',
      cancellationPolicy: 'Free cancellation up to 24 hours before pickup.',
    },
  });

  await prisma.assetImage.upsert({
    where: { id: 'cm-toolshare-demo-asset-image' },
    update: {
      assetId: asset.id,
      url: 'https://example.com/assets/canon-r50-cover.jpg',
      sortOrder: 0,
      isCover: true,
    },
    create: {
      id: 'cm-toolshare-demo-asset-image',
      assetId: asset.id,
      url: 'https://example.com/assets/canon-r50-cover.jpg',
      sortOrder: 0,
      isCover: true,
    },
  });

  for (const accessory of [
    { id: 'cm-toolshare-acc-battery', name: 'Battery', quantity: 2 },
    { id: 'cm-toolshare-acc-charger', name: 'Charger', quantity: 1 },
    { id: 'cm-toolshare-acc-bag', name: 'Bag', quantity: 1 },
  ]) {
    await prisma.assetAccessory.upsert({
      where: { id: accessory.id },
      update: {
        assetId: asset.id,
        name: accessory.name,
        quantity: accessory.quantity,
      },
      create: {
        id: accessory.id,
        assetId: asset.id,
        name: accessory.name,
        quantity: accessory.quantity,
      },
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
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
