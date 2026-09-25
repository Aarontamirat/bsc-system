import "server-only";

import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/client";

export type ScorecardActor = {
  userId: string;
  role: UserRole;
  departmentId: string;
  canAdministerAllDepartments: boolean;
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
      | "VALIDATION_ERROR",
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
  if (actor.role !== UserRole.ADMIN) {
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
  if (actor.canAdministerAllDepartments) {
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

/* ==========================================================================
   Serialization Helpers (Convert Decimal Instances to Standard JS Numbers)
   ========================================================================== */

function serializeActivity<
  T extends {
    weight: unknown;
    annualTarget?: unknown;
    baseline?: unknown;
  },
>(activity: T) {
  return {
    ...activity,
    weight: Number(activity.weight),
    ...(activity.annualTarget !== undefined
      ? { annualTarget: Number(activity.annualTarget) }
      : {}),
    ...(activity.baseline !== undefined
      ? { baseline: Number(activity.baseline) }
      : {}),
  };
}

function serializeObjective<
  T extends {
    weight: unknown;
    activities?: Array<any>;
  },
>(objective: T) {
  return {
    ...objective,
    weight: Number(objective.weight),
    activities: objective.activities?.map(serializeActivity),
  };
}

function serializePerspective<
  T extends {
    weight: unknown;
    objectives?: Array<any>;
  },
>(perspective: T) {
  return {
    ...perspective,
    weight: Number(perspective.weight),
    objectives: perspective.objectives?.map(serializeObjective),
  };
}

export function serializeScorecard<
  T extends {
    perspectives?: Array<any>;
  },
>(scorecard: T) {
  return {
    ...scorecard,
    perspectives: scorecard.perspectives?.map(serializePerspective),
  };
}

/* ==========================================================================
   Service Actions
   ========================================================================== */

/**
 * Return all scorecards visible to the current user.
 *
 * Administration administrators:
 *   - Can see every department.
 *
 * Department users:
 *   - Can see only their assigned department.
 */
export async function getScorecards(actor: ScorecardActor, year?: number) {
  if (year !== undefined) {
    assertValidYear(year);
  }

  const where = actor.canAdministerAllDepartments
    ? {
        ...(year !== undefined ? { year } : {}),
      }
    : {
        departmentId: actor.departmentId ?? "__NO_DEPARTMENT__",
        ...(year !== undefined ? { year } : {}),
      };

  const scorecards = await prisma.scorecard.findMany({
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

  return scorecards.map(serializeScorecard);
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

  return serializeScorecard(scorecard);
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

  assertDepartmentAccess(actor, department.id);

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

  const createdScorecard = await prisma.scorecard.create({
    data: {
      departmentId: input.departmentId,
      year: input.year,
    },
    include: SCORECARD_INCLUDE,
  });

  return serializeScorecard(createdScorecard);
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

  assertDepartmentAccess(actor, existing.departmentId);

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

  assertDepartmentAccess(actor, department.id);

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

  const updatedScorecard = await prisma.scorecard.update({
    where: {
      id: scorecardId,
    },
    data: {
      departmentId,
      year,
    },
    include: SCORECARD_INCLUDE,
  });

  return serializeScorecard(updatedScorecard);
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

  if (scorecard.perspectives.length === 0) {
    throw new ScorecardServiceError(
      "Scorecard must contain at least one perspective.",
      "VALIDATION_ERROR",
    );
  }

  assertWeightTotal(scorecard.perspectives, "Perspective");

  for (const perspective of scorecard.perspectives) {
    if (perspective.objectives.length === 0) {
      throw new ScorecardServiceError(
        `Perspective "${perspective.name}" must contain at least one objective.`,
        "VALIDATION_ERROR",
      );
    }

    assertWeightTotal(
      perspective.objectives,
      `Objectives under "${perspective.name}"`,
    );

    for (const objective of perspective.objectives) {
      if (objective.activities.length === 0) {
        throw new ScorecardServiceError(
          `Objective "${objective.name}" must contain at least one activity.`,
          "VALIDATION_ERROR",
        );
      }

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
 * Delete a draft scorecard only when it has no operational data attached.
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
    },
  });

  if (!scorecard) {
    throw new ScorecardServiceError("Scorecard not found.", "NOT_FOUND");
  }

  assertDepartmentAccess(actor, scorecard.departmentId);

  if (
    scorecard.monthlyPlans.length > 0 ||
    scorecard.monthlyActuals.length > 0
  ) {
    throw new ScorecardServiceError(
      "This scorecard contains monthly operational data and cannot be deleted.",
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
