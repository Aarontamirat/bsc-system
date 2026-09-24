import "server-only";

import { prisma } from "@/lib/prisma";
import {
  ScorecardServiceError,
  type ScorecardActor,
} from "./scorecard.service";
import { UnitOfMeasure, UserRole } from "@/generated/prisma";

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function assertValidName(value: string, field: string) {
  const normalized = normalizeName(value);

  if (!normalized) {
    throw new ScorecardServiceError(`${field} is required.`, "VALIDATION_ERROR");
  }

  if (normalized.length > 200) {
    throw new ScorecardServiceError(
      `${field} must be 200 characters or fewer.`,
      "VALIDATION_ERROR",
    );
  }

  return normalized;
}

function assertPositiveWeight(weight: number) {
  if (!Number.isFinite(weight) || weight <= 0 || weight > 100) {
    throw new ScorecardServiceError(
      "Weight must be greater than 0 and no more than 100.",
      "VALIDATION_ERROR",
    );
  }
}

function assertWeightTotal(total: number) {
  if (total > 100.000001) {
    throw new ScorecardServiceError(
      "The total weight cannot exceed 100%.",
      "VALIDATION_ERROR",
    );
  }
}

function assertAdmin(actor: ScorecardActor) {
  if (actor.role !== UserRole.ADMIN) {
    throw new ScorecardServiceError(
      "Only administrators can modify scorecard structure.",
      "FORBIDDEN",
    );
  }
}

async function getAuthorizedScorecard(
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
    where: { id: scorecardId },
    select: {
      id: true,
      departmentId: true,
      year: true,
    },
  });

  if (!scorecard) {
    throw new ScorecardServiceError("Scorecard not found.", "NOT_FOUND");
  }

  if (
    actor.role !== UserRole.ADMIN &&
    (!actor.departmentId || actor.departmentId !== scorecard.departmentId)
  ) {
    throw new ScorecardServiceError(
      "You do not have access to this scorecard.",
      "FORBIDDEN",
    );
  }

  return scorecard;
}

/* -------------------------------------------------------------------------- */
/* READ                                                                       */
/* -------------------------------------------------------------------------- */

export async function getScorecardStructure(
  actor: ScorecardActor,
  scorecardId: string,
) {
  await getAuthorizedScorecard(actor, scorecardId);

  return prisma.scorecard.findUnique({
    where: {
      id: scorecardId,
    },
    include: {
      department: true,
      perspectives: {
        include: {
          objectives: {
            include: {
              activities: {
                include: {
                  responsibleUnits: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

/* -------------------------------------------------------------------------- */
/* PERSPECTIVES                                                               */
/* -------------------------------------------------------------------------- */

export async function createPerspective(
  actor: ScorecardActor,
  input: {
    scorecardId: string;
    name: string;
    weight: number;
  },
) {
  assertAdmin(actor);

  await getAuthorizedScorecard(actor, input.scorecardId);

  const name = assertValidName(input.name, "Perspective name");
  const weight = Number(input.weight);

  assertPositiveWeight(weight);

  const existing = await prisma.perspective.findMany({
    where: {
      scorecardId: input.scorecardId,
    },
    select: {
      weight: true,
    },
  });

  const currentTotal = existing.reduce(
    (sum, item) => sum + Number(item.weight),
    0,
  );

  const newTotal = currentTotal + weight;

  assertWeightTotal(newTotal);

  return prisma.perspective.create({
    data: {
      scorecardId: input.scorecardId,
      name,
      weight,
    },
  });
}

export async function updatePerspective(
  actor: ScorecardActor,
  input: {
    id: string;
    name: string;
    weight: number;
  },
) {
  assertAdmin(actor);

  const existingPerspective = await prisma.perspective.findUnique({
    where: {
      id: input.id,
    },
    select: {
      id: true,
      scorecardId: true,
      weight: true,
    },
  });

  if (!existingPerspective) {
    throw new ScorecardServiceError("Perspective not found.", "NOT_FOUND");
  }

  await getAuthorizedScorecard(actor, existingPerspective.scorecardId);

  const name = assertValidName(input.name, "Perspective name");
  const weight = Number(input.weight);

  assertPositiveWeight(weight);

  const siblings = await prisma.perspective.findMany({
    where: {
      scorecardId: existingPerspective.scorecardId,
      NOT: {
        id: existingPerspective.id,
      },
    },
    select: {
      weight: true,
    },
  });

  const siblingTotal = siblings.reduce(
    (sum, item) => sum + Number(item.weight),
    0,
  );

  assertWeightTotal(siblingTotal + weight);

  return prisma.perspective.update({
    where: {
      id: existingPerspective.id,
    },
    data: {
      name,
      weight,
    },
  });
}

export async function deletePerspective(
  actor: ScorecardActor,
  perspectiveId: string,
) {
  assertAdmin(actor);

  const perspective = await prisma.perspective.findUnique({
    where: {
      id: perspectiveId,
    },
    select: {
      id: true,
      scorecardId: true,
      _count: {
        select: {
          objectives: true,
        },
      },
    },
  });

  if (!perspective) {
    throw new ScorecardServiceError("Perspective not found.", "NOT_FOUND");
  }

  await getAuthorizedScorecard(actor, perspective.scorecardId);

  if (perspective._count.objectives > 0) {
    throw new ScorecardServiceError(
      "This perspective contains objectives. Remove its objectives before deleting the perspective.",
      "CONFLICT",
    );
  }

  await prisma.perspective.delete({
    where: {
      id: perspectiveId,
    },
  });

  return {
    success: true as const,
  };
}

/* -------------------------------------------------------------------------- */
/* OBJECTIVES                                                                 */
/* -------------------------------------------------------------------------- */

export async function createObjective(
  actor: ScorecardActor,
  input: {
    perspectiveId: string;
    name: string;
    weight: number;
  },
) {
  assertAdmin(actor);

  const perspective = await prisma.perspective.findUnique({
    where: {
      id: input.perspectiveId,
    },
    select: {
      id: true,
      scorecardId: true,
    },
  });

  if (!perspective) {
    throw new ScorecardServiceError("Perspective not found.", "NOT_FOUND");
  }

  await getAuthorizedScorecard(actor, perspective.scorecardId);

  const name = assertValidName(input.name, "Objective name");
  const weight = Number(input.weight);

  assertPositiveWeight(weight);

  const existing = await prisma.objective.findMany({
    where: {
      perspectiveId: input.perspectiveId,
    },
    select: {
      weight: true,
    },
  });

  const currentTotal = existing.reduce(
    (sum, item) => sum + Number(item.weight),
    0,
  );

  assertWeightTotal(currentTotal + weight);

  return prisma.objective.create({
    data: {
      perspectiveId: input.perspectiveId,
      name,
      weight,
    },
  });
}

export async function updateObjective(
  actor: ScorecardActor,
  input: {
    id: string;
    name: string;
    weight: number;
  },
) {
  assertAdmin(actor);

  const existingObjective = await prisma.objective.findUnique({
    where: {
      id: input.id,
    },
    select: {
      id: true,
      perspectiveId: true,
      weight: true,
      perspective: {
        select: {
          scorecardId: true,
        },
      },
    },
  });

  if (!existingObjective) {
    throw new ScorecardServiceError("Objective not found.", "NOT_FOUND");
  }

  await getAuthorizedScorecard(
    actor,
    existingObjective.perspective.scorecardId,
  );

  const name = assertValidName(input.name, "Objective name");
  const weight = Number(input.weight);

  assertPositiveWeight(weight);

  const siblings = await prisma.objective.findMany({
    where: {
      perspectiveId: existingObjective.perspectiveId,
      NOT: {
        id: existingObjective.id,
      },
    },
    select: {
      weight: true,
    },
  });

  const siblingTotal = siblings.reduce(
    (sum, item) => sum + Number(item.weight),
    0,
  );

  assertWeightTotal(siblingTotal + weight);

  return prisma.objective.update({
    where: {
      id: existingObjective.id,
    },
    data: {
      name,
      weight,
    },
  });
}

export async function deleteObjective(
  actor: ScorecardActor,
  objectiveId: string,
) {
  assertAdmin(actor);

  const objective = await prisma.objective.findUnique({
    where: {
      id: objectiveId,
    },
    select: {
      id: true,
      perspective: {
        select: {
          scorecardId: true,
        },
      },
      _count: {
        select: {
          activities: true,
        },
      },
    },
  });

  if (!objective) {
    throw new ScorecardServiceError("Objective not found.", "NOT_FOUND");
  }

  await getAuthorizedScorecard(actor, objective.perspective.scorecardId);

  if (objective._count.activities > 0) {
    throw new ScorecardServiceError(
      "This objective contains activities. Remove its activities before deleting the objective.",
      "CONFLICT",
    );
  }

  await prisma.objective.delete({
    where: {
      id: objectiveId,
    },
  });

  return {
    success: true as const,
  };
}

/* -------------------------------------------------------------------------- */
/* ACTIVITIES                                                                 */
/* -------------------------------------------------------------------------- */

export async function createActivity(
  actor: ScorecardActor,
  input: {
    objectiveId: string;
    name: string;
    weight: number;
    unitOfMeasure: UnitOfMeasure;
    annualTarget: number;
    baseline?: number;
    remark?: string;
  },
) {
  assertAdmin(actor);

  const objective = await prisma.objective.findUnique({
    where: {
      id: input.objectiveId,
    },
    select: {
      id: true,
      perspective: {
        select: {
          scorecardId: true,
        },
      },
    },
  });

  if (!objective) {
    throw new ScorecardServiceError("Objective not found.", "NOT_FOUND");
  }

  await getAuthorizedScorecard(actor, objective.perspective.scorecardId);

  const name = assertValidName(input.name, "Activity name");
  const weight = Number(input.weight);
  const annualTarget = Number(input.annualTarget);
  const baseline = Number(input.baseline ?? 0);

  assertPositiveWeight(weight);

  if (!Number.isFinite(annualTarget)) {
    throw new ScorecardServiceError(
      "Annual target must be a valid number.",
      "VALIDATION_ERROR",
    );
  }

  if (!Number.isFinite(baseline)) {
    throw new ScorecardServiceError(
      "Baseline must be a valid number.",
      "VALIDATION_ERROR",
    );
  }

  const existing = await prisma.activity.findMany({
    where: {
      objectiveId: input.objectiveId,
    },
    select: {
      weight: true,
    },
  });

  const currentTotal = existing.reduce(
    (sum, item) => sum + Number(item.weight),
    0,
  );

  assertWeightTotal(currentTotal + weight);

  const lastActivity = await prisma.activity.findFirst({
    where: {
      objectiveId: input.objectiveId,
    },
    orderBy: {
      sortOrder: "desc",
    },
    select: {
      sortOrder: true,
    },
  });

  const sortOrder = (lastActivity?.sortOrder ?? -1) + 1;

  return prisma.activity.create({
    data: {
      objectiveId: input.objectiveId,
      name,
      weight,
      unitOfMeasure: input.unitOfMeasure,
      annualTarget,
      baseline,
      remark: input.remark?.trim() || null,
      sortOrder,
    },
  });
}

export async function updateActivity(
  actor: ScorecardActor,
  input: {
    id: string;
    name: string;
    weight: number;
    unitOfMeasure: UnitOfMeasure;
    annualTarget: number;
    baseline?: number;
    remark?: string;
  },
) {
  assertAdmin(actor);

  const existingActivity = await prisma.activity.findUnique({
    where: {
      id: input.id,
    },
    select: {
      id: true,
      objectiveId: true,
      weight: true,
      objective: {
        select: {
          perspective: {
            select: {
              scorecardId: true,
            },
          },
        },
      },
    },
  });

  if (!existingActivity) {
    throw new ScorecardServiceError("Activity not found.", "NOT_FOUND");
  }

  await getAuthorizedScorecard(
    actor,
    existingActivity.objective.perspective.scorecardId,
  );

  const name = assertValidName(input.name, "Activity name");
  const weight = Number(input.weight);
  const annualTarget = Number(input.annualTarget);
  const baseline = Number(input.baseline ?? 0);

  assertPositiveWeight(weight);

  if (!Number.isFinite(annualTarget)) {
    throw new ScorecardServiceError(
      "Annual target must be a valid number.",
      "VALIDATION_ERROR",
    );
  }

  if (!Number.isFinite(baseline)) {
    throw new ScorecardServiceError(
      "Baseline must be a valid number.",
      "VALIDATION_ERROR",
    );
  }

  const siblings = await prisma.activity.findMany({
    where: {
      objectiveId: existingActivity.objectiveId,
      NOT: {
        id: existingActivity.id,
      },
    },
    select: {
      weight: true,
    },
  });

  const siblingTotal = siblings.reduce(
    (sum, item) => sum + Number(item.weight),
    0,
  );

  assertWeightTotal(siblingTotal + weight);

  return prisma.activity.update({
    where: {
      id: existingActivity.id,
    },
    data: {
      name,
      weight,
      unitOfMeasure: input.unitOfMeasure,
      annualTarget,
      baseline,
      remark: input.remark?.trim() || null,
    },
  });
}

export async function deleteActivity(
  actor: ScorecardActor,
  activityId: string,
) {
  assertAdmin(actor);

  const activity = await prisma.activity.findUnique({
    where: {
      id: activityId,
    },
    select: {
      id: true,
      objective: {
        select: {
          perspective: {
            select: {
              scorecardId: true,
            },
          },
        },
      },
      _count: {
        select: {
          monthlyPlans: true,
          monthlyActuals: true,
        },
      },
    },
  });

  if (!activity) {
    throw new ScorecardServiceError("Activity not found.", "NOT_FOUND");
  }

  await getAuthorizedScorecard(
    actor,
    activity.objective.perspective.scorecardId,
  );

  if (activity._count.monthlyPlans > 0 || activity._count.monthlyActuals > 0) {
    throw new ScorecardServiceError(
      "This activity has monthly planning or actual data and cannot be deleted.",
      "CONFLICT",
    );
  }

  await prisma.activity.delete({
    where: {
      id: activityId,
    },
  });

  return {
    success: true as const,
  };
}
