import { prisma } from "@/lib/prisma";

export type ScorecardActor = {
  userId: string;
  role: string;
  departmentId: string | null;
};

export type CreateScorecardInput = {
  departmentId: string;
  year: number;
};

export type UpdateScorecardInput = {
  departmentId?: string;
  year?: number;
};

export class ScorecardServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "CONFLICT"
      | "VALIDATION_ERROR" = "VALIDATION_ERROR",
  ) {
    super(message);
    this.name = "ScorecardServiceError";
  }
}

const SCORECARD_INCLUDE = {
  department: true,
  perspectives: {
    orderBy: {
      name: "asc" as const,
    },
    include: {
      objectives: {
        orderBy: {
          name: "asc" as const,
        },
        include: {
          activities: {
            orderBy: {
              name: "asc" as const,
            },
          },
        },
      },
    },
  },
} as const;

function assertAdmin(actor: ScorecardActor): void {
  if (actor.role !== "admin") {
    throw new ScorecardServiceError(
      "Only administrators can modify scorecards.",
      "FORBIDDEN",
    );
  }
}

function assertDepartmentAccess(
  actor: ScorecardActor,
  departmentId: string,
): void {
  if (actor.role === "admin") {
    return;
  }

  if (!actor.departmentId) {
    throw new ScorecardServiceError(
      "Your account is not assigned to a department.",
      "FORBIDDEN",
    );
  }

  if (actor.departmentId !== departmentId) {
    throw new ScorecardServiceError(
      "You do not have access to this department's scorecard.",
      "FORBIDDEN",
    );
  }
}

function assertValidYear(year: number): void {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new ScorecardServiceError(
      "A valid fiscal year is required.",
      "VALIDATION_ERROR",
    );
  }
}

function calculateWeightTotal(items: Array<{ weight: unknown }>): number {
  return items.reduce((total, item) => total + Number(item.weight), 0);
}

function assertWeightTotal(
  items: Array<{ weight: unknown }>,
  label: string,
): void {
  const total = calculateWeightTotal(items);

  if (!Number.isFinite(total)) {
    throw new ScorecardServiceError(
      `${label} contains an invalid weight.`,
      "VALIDATION_ERROR",
    );
  }

  if (Math.abs(total - 100) > 0.01) {
    throw new ScorecardServiceError(
      `${label} weights must total exactly 100%. Current total: ${total.toFixed(2)}%.`,
      "VALIDATION_ERROR",
    );
  }
}

/**
 * Return all scorecards visible to the current user.
 *
 * Administrators:
 *   - Can see every department.
 *
 * Department users:
 *   - Can see only their assigned department.
 */
export async function getScorecards(actor: ScorecardActor, year?: number) {
  if (year !== undefined) {
    assertValidYear(year);
  }

  const where =
    actor.role === "admin"
      ? {
          ...(year !== undefined ? { year } : {}),
        }
      : {
          departmentId: actor.departmentId ?? "__NO_DEPARTMENT__",
          ...(year !== undefined ? { year } : {}),
        };

  return prisma.scorecard.findMany({
    where,
    include: SCORECARD_INCLUDE,
    orderBy: [
      {
        year: "desc",
      },
      {
        department: {
          name: "asc",
        },
      },
    ],
  });
}

/**
 * Return one scorecard with its complete hierarchy.
 */
export async function getScorecardById(
  actor: ScorecardActor,
  scorecardId: string,
) {
  if (!scorecardId) {
    throw new ScorecardServiceError(
      "Scorecard ID is required.",
      "VALIDATION_ERROR",
    );
  }

  const scorecard = await prisma.scorecard.findUnique({
    where: {
      id: scorecardId,
    },
    include: SCORECARD_INCLUDE,
  });

  if (!scorecard) {
    throw new ScorecardServiceError("Scorecard not found.", "NOT_FOUND");
  }

  assertDepartmentAccess(actor, scorecard.departmentId);

  return scorecard;
}

/**
 * Create a new yearly scorecard for a department.
 *
 * There can only be one scorecard for a department/fiscal year.
 */
export async function createScorecard(
  actor: ScorecardActor,
  input: CreateScorecardInput,
) {
  assertAdmin(actor);

  if (!input.departmentId) {
    throw new ScorecardServiceError(
      "Department is required.",
      "VALIDATION_ERROR",
    );
  }

  assertValidYear(input.year);

  const department = await prisma.department.findUnique({
    where: {
      id: input.departmentId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!department) {
    throw new ScorecardServiceError("Department not found.", "NOT_FOUND");
  }

  const existingScorecard = await prisma.scorecard.findUnique({
    where: {
      departmentId_year: {
        departmentId: input.departmentId,
        year: input.year,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingScorecard) {
    throw new ScorecardServiceError(
      `A scorecard already exists for ${department.name} for FY${input.year}.`,
      "CONFLICT",
    );
  }

  return prisma.scorecard.create({
    data: {
      departmentId: input.departmentId,
      year: input.year,
    },
    include: SCORECARD_INCLUDE,
  });
}

/**
 * Update the department/year identity of an existing scorecard.
 *
 * Hierarchy contents are intentionally not modified here.
 */
export async function updateScorecard(
  actor: ScorecardActor,
  scorecardId: string,
  input: UpdateScorecardInput,
) {
  assertAdmin(actor);

  const existing = await prisma.scorecard.findUnique({
    where: {
      id: scorecardId,
    },
    select: {
      id: true,
      departmentId: true,
      year: true,
    },
  });

  if (!existing) {
    throw new ScorecardServiceError("Scorecard not found.", "NOT_FOUND");
  }

  const departmentId = input.departmentId ?? existing.departmentId;
  const year = input.year ?? existing.year;

  if (!departmentId) {
    throw new ScorecardServiceError(
      "Department is required.",
      "VALIDATION_ERROR",
    );
  }

  assertValidYear(year);

  const department = await prisma.department.findUnique({
    where: {
      id: departmentId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!department) {
    throw new ScorecardServiceError("Department not found.", "NOT_FOUND");
  }

  const duplicate = await prisma.scorecard.findFirst({
    where: {
      departmentId,
      year,
      NOT: {
        id: scorecardId,
      },
    },
    select: {
      id: true,
    },
  });

  if (duplicate) {
    throw new ScorecardServiceError(
      `A scorecard already exists for ${department.name} for FY${year}.`,
      "CONFLICT",
    );
  }

  return prisma.scorecard.update({
    where: {
      id: scorecardId,
    },
    data: {
      departmentId,
      year,
    },
    include: SCORECARD_INCLUDE,
  });
}

/**
 * Validate the complete BSC weight hierarchy.
 *
 * Rules:
 *   Perspectives inside a scorecard = 100%
 *   Objectives inside every perspective = 100%
 *   Activities inside every objective = 100%
 */
export async function validateScorecardWeights(
  actor: ScorecardActor,
  scorecardId: string,
): Promise<{ valid: true }> {
  const scorecard = await getScorecardById(actor, scorecardId);

  assertWeightTotal(scorecard.perspectives, "Perspective");

  for (const perspective of scorecard.perspectives) {
    assertWeightTotal(
      perspective.objectives,
      `Objectives under "${perspective.name}"`,
    );

    for (const objective of perspective.objectives) {
      assertWeightTotal(
        objective.activities,
        `Activities under "${objective.name}"`,
      );
    }
  }

  return {
    valid: true,
  };
}

/**
 * Delete a scorecard only when it has no operational data attached.
 *
 * We deliberately protect this operation instead of blindly cascading
 * through monthly plans/actuals and potentially destroying performance
 * history.
 */
export async function deleteScorecard(
  actor: ScorecardActor,
  scorecardId: string,
) {
  assertAdmin(actor);

  const scorecard = await prisma.scorecard.findUnique({
    where: {
      id: scorecardId,
    },
    select: {
      id: true,
      departmentId: true,
      year: true,
      monthlyPlans: {
        select: {
          id: true,
        },
        take: 1,
      },
      monthlyActuals: {
        select: {
          id: true,
        },
        take: 1,
      },
      perspectives: {
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!scorecard) {
    throw new ScorecardServiceError("Scorecard not found.", "NOT_FOUND");
  }

  if (
    scorecard.monthlyPlans.length > 0 ||
    scorecard.monthlyActuals.length > 0
  ) {
    throw new ScorecardServiceError(
      "This scorecard contains monthly operational data and cannot be deleted.",
      "CONFLICT",
    );
  }

  if (scorecard.perspectives.length > 0) {
    throw new ScorecardServiceError(
      "Remove the scorecard hierarchy before deleting the scorecard.",
      "CONFLICT",
    );
  }

  await prisma.scorecard.delete({
    where: {
      id: scorecardId,
    },
  });

  return {
    success: true as const,
  };
}
