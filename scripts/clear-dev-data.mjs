import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Wipe ALL application data so onboarding can start fresh.
  // Order matters because of foreign keys.
  const result = await prisma.$transaction(async (tx) => {
    const validationLogs = await tx.validationLog.deleteMany({});
    const activityLogs = await tx.activityLog.deleteMany({});
    const codes = await tx.code.deleteMany({});
    const gates = await tx.gate.deleteMany({});
    const users = await tx.user.deleteMany({});
    const residents = await tx.resident.deleteMany({});
    const estates = await tx.estate.deleteMany({});
    const botSessions = await tx.botSession.deleteMany({});

    return {
      validationLogs: validationLogs.count,
      activityLogs: activityLogs.count,
      codes: codes.count,
      gates: gates.count,
      users: users.count,
      residents: residents.count,
      estates: estates.count,
      botSessions: botSessions.count,
    };
  });

  console.log("Cleared dev data:");
  console.table(result);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
