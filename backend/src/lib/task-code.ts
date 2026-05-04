import { prisma } from "./prisma";

/**
 * Returns the next available global task code in the format T000001.
 *
 * The implementation finds the highest existing numeric code and increments it.
 * This function must be called inside a transaction or with appropriate
 * serialization when used at high concurrency, but for SQLite (single-writer)
 * the default behavior is safe.
 */
export async function getNextTaskCode(): Promise<string> {
  // Find the task with the highest numeric task_code
  const last = await prisma.projectTask.findFirst({
    where: {
      task_code: { not: null },
    },
    orderBy: { task_code: "desc" },
    select: { task_code: true },
  });

  let next = 1;
  if (last?.task_code) {
    // Extract the numeric part from e.g. "T000042" → 42
    const numeric = parseInt(last.task_code.replace(/^T/, ""), 10);
    if (!isNaN(numeric)) {
      next = numeric + 1;
    }
  }

  return "T" + String(next).padStart(6, "0");
}
