import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

async function main() {
  const email = requireEnv("SUPER_ADMIN_EMAIL");
  const password = requireEnv("SUPER_ADMIN_PASSWORD");
  const name = process.env.SUPER_ADMIN_NAME ?? "Super Admin";

  const existing = await prisma.user.findFirst({
    where: { email, role: Role.SUPER_ADMIN },
  });

  if (existing) {
    console.log("Super admin already exists:", existing.email);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      role: Role.SUPER_ADMIN,
      email,
      name,
      passwordHash,
    },
  });

  console.log("Created super admin:", email);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
