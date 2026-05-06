
async function listEstates() {
  await new Promise(resolve => setTimeout(resolve, 50));
  return Array.from({ length: 50 }, (_, i) => ({
    estateId: `estate_${i}`,
    status: "ACTIVE",
    name: `Estate ${i}`,
    createdAt: new Date().toISOString()
  }));
}

async function listUsersForEstate({ estateId, limit }) {
  await new Promise(resolve => setTimeout(resolve, 50));
  return Array.from({ length: 10 }, (_, i) => ({
    userId: `user_${i}`,
    role: i % 4 === 0 ? "RESIDENT" : i % 4 === 1 ? "GUARD" : i % 4 === 2 ? "ESTATE_ADMIN" : "RESIDENT_DELEGATE"
  }));
}

async function listValidationLogsForEstate({ estateId, limit }) {
  await new Promise(resolve => setTimeout(resolve, 50));
  return Array.from({ length: 20 }, (_, i) => ({
    logId: `log_${i}`,
    outcome: i % 5 === 0 ? "FAILURE" : "SUCCESS",
    validatedAt: new Date().toISOString()
  }));
}

async function runOriginal() {
  const startTime = Date.now();

  // Get all estates
  const estates = await listEstates({ limit: 500 });
  const activeEstates = estates.filter((e) => e.status === "ACTIVE");
  const suspendedEstates = estates.filter((e) => e.status === "INACTIVE" || e.status === "SUSPENDED");

  // Aggregate stats across all estates
  let totalUsers = 0;
  let totalResidents = 0;
  let totalGuards = 0;
  let totalAdmins = 0;
  let totalValidations = 0;
  let successfulValidations = 0;
  let failedValidations = 0;
  let todayValidations = 0;
  let weekValidations = 0;
  let monthValidations = 0;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const dailyValidations = {};
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    dailyValidations[dateStr] = { date: dateStr, success: 0, failed: 0 };
  }

  const estatesToProcess = estates.slice(0, 50);

  for (const estate of estatesToProcess) {
    const users = await listUsersForEstate({ estateId: estate.estateId, limit: 500 });
    totalUsers += users.length;
    totalResidents += users.filter((u) => u.role === "RESIDENT" || u.role === "RESIDENT_DELEGATE").length;
    totalGuards += users.filter((u) => u.role === "GUARD").length;
    totalAdmins += users.filter((u) => u.role === "ESTATE_ADMIN").length;

    const validationLogs = await listValidationLogsForEstate({ estateId: estate.estateId, limit: 500 });
    totalValidations += validationLogs.length;

    for (const log of validationLogs) {
      if (log.outcome === "SUCCESS") {
        successfulValidations++;
      } else {
        failedValidations++;
      }

      if (log.validatedAt >= todayStart) todayValidations++;
      if (log.validatedAt >= weekAgo) weekValidations++;
      if (log.validatedAt >= monthAgo) monthValidations++;

      const logDate = log.validatedAt.split("T")[0];
      if (dailyValidations[logDate]) {
        if (log.outcome === "SUCCESS") {
          dailyValidations[logDate].success++;
        } else {
          dailyValidations[logDate].failed++;
        }
      }
    }
  }

  const endTime = Date.now();
  console.log(`Original implementation took: ${endTime - startTime}ms`);
}

async function runOptimized() {
  const startTime = Date.now();

  // Get all estates
  const estates = await listEstates({ limit: 500 });
  const activeEstates = estates.filter((e) => e.status === "ACTIVE");
  const suspendedEstates = estates.filter((e) => e.status === "INACTIVE" || e.status === "SUSPENDED");

  // Aggregate stats across all estates
  let totalUsers = 0;
  let totalResidents = 0;
  let totalGuards = 0;
  let totalAdmins = 0;
  let totalValidations = 0;
  let successfulValidations = 0;
  let failedValidations = 0;
  let todayValidations = 0;
  let weekValidations = 0;
  let monthValidations = 0;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const dailyValidations = {};
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    dailyValidations[dateStr] = { date: dateStr, success: 0, failed: 0 };
  }

  const estatesToProcess = estates.slice(0, 50);

  // Fetch data for all estates in parallel to avoid N+1 query pattern
  const estateResults = await Promise.all(
    estatesToProcess.map(async (estate) => {
      const [users, validationLogs] = await Promise.all([
        listUsersForEstate({ estateId: estate.estateId, limit: 500 }),
        listValidationLogsForEstate({ estateId: estate.estateId, limit: 500 }),
      ]);
      return { users, validationLogs };
    }),
  );

  for (const { users, validationLogs } of estateResults) {
    totalUsers += users.length;
    totalResidents += users.filter((u) => u.role === "RESIDENT" || u.role === "RESIDENT_DELEGATE").length;
    totalGuards += users.filter((u) => u.role === "GUARD").length;
    totalAdmins += users.filter((u) => u.role === "ESTATE_ADMIN").length;

    totalValidations += validationLogs.length;

    for (const log of validationLogs) {
      if (log.outcome === "SUCCESS") {
        successfulValidations++;
      } else {
        failedValidations++;
      }

      if (log.validatedAt >= todayStart) todayValidations++;
      if (log.validatedAt >= weekAgo) weekValidations++;
      if (log.validatedAt >= monthAgo) monthValidations++;

      const logDate = log.validatedAt.split("T")[0];
      if (dailyValidations[logDate]) {
        if (log.outcome === "SUCCESS") {
          dailyValidations[logDate].success++;
        } else {
          dailyValidations[logDate].failed++;
        }
      }
    }
  }

  const endTime = Date.now();
  console.log(`Optimized implementation took: ${endTime - startTime}ms`);
}

async function runBenchmark() {
  console.log("Starting benchmark...");
  await runOriginal();
  await runOptimized();
  console.log("Benchmark complete.");
}

runBenchmark();
