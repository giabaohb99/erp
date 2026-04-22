import { prisma } from "@/lib/prisma"

/**
 * Auto-generate employee code: RTR-{YEAR}-{3-digit-sequence}
 * Queries DB for max sequence of current year
 * SERVER-ONLY — uses Prisma
 */
export async function generateEmployeeCode(): Promise<string> {
  const prefix = `POD`

  const lastEmployee = await prisma.employee.findFirst({
    where: {
      employeeCode: { startsWith: prefix },
    },
    orderBy: { employeeCode: "desc" },
    select: { employeeCode: true },
  })

  let sequence = 1
  if (lastEmployee) {
    const lastSeqStr = lastEmployee.employeeCode.replace(prefix, "")
    const lastSeq = parseInt(lastSeqStr, 10)
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1
    }
  }

  return `${prefix}${sequence.toString().padStart(4, "0")}`
}
