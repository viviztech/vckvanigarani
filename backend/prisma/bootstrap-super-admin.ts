/**
 * Creates the very first Super Admin. There is no self-registration
 * (Constitution Principle V) and no admin exists yet on a fresh database, so
 * this one-time CLI script is the only way to get started — every
 * subsequent bearer is created through the app itself, by this admin.
 *
 * Usage:
 *   npm run bootstrap:super-admin -- "Full Name" "+91XXXXXXXXXX" "admin@example.com"
 */
import 'dotenv/config';
import { PrismaService } from '../src/prisma/prisma.service';
import { AdminRole, BearerStatus } from '../generated/prisma/enums';

async function main() {
  const [fullName, phone, email] = process.argv.slice(2);
  if (!fullName || !phone || !email) {
    console.error('Usage: npm run bootstrap:super-admin -- "Full Name" "+91XXXXXXXXXX" "admin@example.com"');
    process.exit(1);
  }

  const prisma = new PrismaService();
  await prisma.onModuleInit();

  try {
    const existing = await prisma.bearer.findUnique({ where: { phone } });
    const bearer = existing
      ? existing
      : await prisma.bearer.create({
          data: {
            fullName,
            phone,
            email,
            address: 'Not set',
            fatherOrHusbandName: 'Not set',
            habitationOrStreet: 'Not set',
            membershipNo: `BOOTSTRAP-${Date.now()}`,
            idProofRef: 'Not set',
            status: BearerStatus.ACTIVE,
          },
        });

    const scope = await prisma.adminScope.upsert({
      where: { adminBearerId: bearer.id },
      update: { role: AdminRole.SUPER_ADMIN, scopeJurisdictionUnitId: null },
      create: { adminBearerId: bearer.id, role: AdminRole.SUPER_ADMIN },
    });

    console.log(existing ? 'Bearer already existed — granted SUPER_ADMIN.' : 'Created bearer and granted SUPER_ADMIN.');
    console.log({ bearerId: bearer.id, email: bearer.email, role: scope.role });
    console.log('\nLog in at the admin-web login screen with this email address.');
    console.log("EMAIL_PROVIDER=mock, so the OTP code is printed in the backend server's own console output.");
  } finally {
    await prisma.onModuleDestroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
