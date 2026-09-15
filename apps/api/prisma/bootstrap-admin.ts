import * as argon2 from 'argon2';
import { PrismaClient, RoleName, UserStatus, VerificationStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to bootstrap an admin account');
}

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const fullName = process.env.BOOTSTRAP_ADMIN_FULL_NAME?.trim() || 'RentLoop Admin';
const phone = process.env.BOOTSTRAP_ADMIN_PHONE?.trim() || '0900000000';
const shouldResetPassword = process.env.BOOTSTRAP_ADMIN_RESET_PASSWORD === 'true';

if (!email) {
  throw new Error('BOOTSTRAP_ADMIN_EMAIL is required');
}

if (!password || password.length < 8) {
  throw new Error('BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters');
}

const adminEmail = email;
const adminPassword = password;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function ensureRole(name: RoleName, description: string) {
  return prisma.role.upsert({
    where: { name },
    update: { description },
    create: { name, description },
  });
}

async function main() {
  const superAdminRole = await ensureRole(RoleName.SUPER_ADMIN, 'Full platform control');
  await ensureRole(RoleName.ADMIN, 'Manages day-to-day operations');
  await ensureRole(RoleName.USER, 'Verified marketplace participant');

  const passwordHash = await argon2.hash(adminPassword, { type: argon2.argon2id });
  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          fullName,
          phone,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: existingUser.emailVerifiedAt ?? new Date(),
          phoneVerifiedAt: existingUser.phoneVerifiedAt ?? new Date(),
          ...(shouldResetPassword ? { passwordHash, refreshTokenHash: null } : {}),
        },
      })
    : await prisma.user.create({
        data: {
          email: adminEmail,
          phone,
          passwordHash,
          fullName,
          status: UserStatus.ACTIVE,
          trustScore: 100,
          emailVerifiedAt: new Date(),
          phoneVerifiedAt: new Date(),
          verification: {
            create: {
              provider: 'bootstrap-admin',
              verificationStatus: VerificationStatus.VERIFIED,
              nameVerified: true,
              dateOfBirthVerified: false,
              faceMatchStatus: 'MATCHED',
              verifiedAt: new Date(),
            },
          },
        },
      });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: superAdminRole.id,
    },
  });

  console.log(
    `Bootstrapped SUPER_ADMIN ${adminEmail}. Password ${
      existingUser && !shouldResetPassword ? 'was not changed' : 'is set from BOOTSTRAP_ADMIN_PASSWORD'
    }.`,
  );
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
