import "server-only";

import { prisma } from "@/lib/prisma";
import { UserRole, type UnitOfMeasure } from "@/generated/prisma/client";
import {
  FISCAL_MONTHS,
  aggregateMonthlyActuals,
  aggregateMonthlyPlans,
  calculateActivityPerformance,
  getFiscalPeriod,
  type FiscalMonthIndex,
} from "@/lib/bsc-calculations";
import type {
  MonthlyPerspectiveDto,
  MonthlyValueInput,
  MonthlyWorkspaceDto,
  ScorecardOptionDto,
} from "@/lib/monthly-data-types";
import {
  ScorecardServiceError,
  type ScorecardActor,
} from "@/lib/services/scorecard.service";

const ALL_FISCAL_MONTH_INDEXES = FISCAL_MONTHS.map(
  (month) => month.index,
) as FiscalMonthIndex[];

type ScorecardForWorkspace = NonNullable<
  Awaited<ReturnType<typeof findScorecardForWorkspace>>
>;

function formatFiscalYear(year: number): string {
  return `FY${year}/${year + 1}`;
}

function toNumber(value: unknown): number {
  return Number(value);
}

function assertAdmin(actor: ScorecardActor): void {
  if (actor.role !== UserRole.ADMIN) {
    throw new ScorecardServiceError(
      "Only administrators can modify monthly plans.",
      "FORBIDDEN",
    );
  }
}

function assertMonthlyValue(input: MonthlyValueInput): void {
  if (!input.activityId) {
    throw new ScorecardServiceError(
      "Activity ID is required.",
      "VALIDATION_ERROR",
    );
  }

  if (!Number.isInteger(input.monthIndex) || input.monthIndex < 0 || input.monthIndex > 11) {
    throw new ScorecardServiceError(
      "Fiscal month index must be an integer from 0 to 11.",
      "VALIDATION_ERROR",
    );
  }

  if (!Number.isFinite(input.value) || input.value < 0) {
    throw new ScorecardServiceError(
      "Monthly values must be non-negative finite numbers.",
      "VALIDATION_ERROR",
    );
  }
}

function accessibleScorecardWhere(actor: ScorecardActor) {
  return actor.role === UserRole.ADMIN
    ? {}
    : {
        departmentId: actor.departmentId,
      };
}

async function findScorecardForWorkspace(
  actor: ScorecardActor,
  scorecardId: string,
) {
  const scorecard = await prisma.scorecard.findFirst({
    where: {
      id: scorecardId,
      ...accessibleScorecardWhere(actor),
    },
    include: {
      department: {
        select: {
          id: true,
          name: true,
        },
      },
      perspectives: {
        orderBy: {
          sortOrder: "asc",
        },
        include: {
          objectives: {
            orderBy: {
              sortOrder: "asc",
            },
            include: {
              activities: {
                orderBy: {
                  sortOrder: "asc",
                },
                include: {
                  responsibleUnits: {
                    include: {
                      department: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                  monthlyPlans: true,
                  monthlyActuals: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!scorecard) {
    throw new ScorecardServiceError("Scorecard not found.", "NOT_FOUND");
  }

  return scorecard;
}

function toScorecardOption(scorecard: {
  id: string;
  departmentId: string;
  year: number;
  department: {
    name: string;
  };
}): ScorecardOptionDto {
  return {
    id: scorecard.id,
    departmentId: scorecard.departmentId,
    departmentName: scorecard.department.name,
    year: scorecard.year,
    label: `${scorecard.department.name} - ${formatFiscalYear(scorecard.year)}`,
  };
}

function valuesByFiscalMonth(
  values: { monthIndex: number; value: number }[],
): number[] {
  const result = Array.from({ length: 12 }, () => 0);

  for (const point of values) {
    if (point.monthIndex >= 0 && point.monthIndex <= 11) {
      result[point.monthIndex] = point.value;
    }
  }

  return result;
}

function getInitialPlanValue(
  unitOfMeasure: UnitOfMeasure,
  annualTarget: number,
): number {
  if (unitOfMeasure === "PERCENT") {
    return annualTarget;
  }

  return annualTarget / 12;
}

function mapWorkspaceScorecard(
  scorecard: ScorecardForWorkspace,
): MonthlyPerspectiveDto[] {
  return scorecard.perspectives.map((perspective) => ({
    id: perspective.id,
    name: perspective.name,
    weight: toNumber(perspective.weight),
    objectives: perspective.objectives.map((objective) => ({
      id: objective.id,
      name: objective.name,
      weight: toNumber(objective.weight),
      activities: objective.activities.map((activity) => {
        const planAggregation = aggregateMonthlyPlans(
          scorecard.year,
          activity.unitOfMeasure,
          activity.monthlyPlans,
          ALL_FISCAL_MONTH_INDEXES,
        );

        const actualAggregation = aggregateMonthlyActuals(
          scorecard.year,
          activity.unitOfMeasure,
          activity.monthlyActuals,
          ALL_FISCAL_MONTH_INDEXES,
        );

        const performance = calculateActivityPerformance({
          unitOfMeasure: activity.unitOfMeasure,
          weight: activity.weight,
          plan: planAggregation.value,
          actual: actualAggregation.value,
        });

        const actualValues = activity.monthlyActuals.map((actual) => ({
          monthIndex: FISCAL_MONTHS.find(
            (month) => month.calendarMonth === actual.month,
          )?.index ?? 0,
          value: toNumber(actual.actualValue),
        }));

        return {
          id: activity.id,
          name: activity.name,
          weight: toNumber(activity.weight),
          unitOfMeasure: activity.unitOfMeasure,
          annualTarget: toNumber(activity.annualTarget),
          baseline: toNumber(activity.baseline),
          remark: activity.remark,
          responsibleUnits: activity.responsibleUnits.map(
            (responsibleUnit) => responsibleUnit.department.name,
          ),
          plans: valuesByFiscalMonth(
            activity.monthlyPlans.map((plan) => ({
              monthIndex: plan.monthIndex,
              value: toNumber(plan.plannedValue),
            })),
          ),
          actuals: valuesByFiscalMonth(actualValues),
          annualPlan: toNumber(planAggregation.value),
          annualActual: toNumber(actualAggregation.value),
          achievementPercent: performance.achievementPercent
            ? toNumber(performance.achievementPercent)
            : null,
          weightedScore: toNumber(performance.weightedScore),
          status: performance.status,
        };
      }),
    })),
  }));
}

export async function getMonthlyWorkspace(
  actor: ScorecardActor,
  scorecardId?: string,
): Promise<MonthlyWorkspaceDto> {
  const scorecards = await prisma.scorecard.findMany({
    where: accessibleScorecardWhere(actor),
    include: {
      department: {
        select: {
          name: true,
        },
      },
    },
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

  const selectedId = scorecardId ?? scorecards[0]?.id;
  const selectedScorecard = selectedId
    ? await findScorecardForWorkspace(actor, selectedId)
    : null;

  return {
    months: FISCAL_MONTHS.map((month) => ({
      index: month.index,
      calendarMonth: month.calendarMonth,
      shortName: month.shortName,
      longName: month.longName,
    })),
    scorecards: scorecards.map(toScorecardOption),
    selectedScorecard: selectedScorecard
      ? toScorecardOption(selectedScorecard)
      : null,
    canEditPlans: actor.role === UserRole.ADMIN,
    canEditActuals: true,
    perspectives: selectedScorecard
      ? mapWorkspaceScorecard(selectedScorecard)
      : [],
  };
}

export async function initializeMonthlyPlans(
  actor: ScorecardActor,
  scorecardId: string,
): Promise<{ created: number }> {
  assertAdmin(actor);

  const scorecard = await findScorecardForWorkspace(actor, scorecardId);

  const activities = scorecard.perspectives.flatMap((perspective) =>
    perspective.objectives.flatMap((objective) => objective.activities),
  );

  const records = activities.flatMap((activity) =>
    FISCAL_MONTHS.map((month) => ({
      scorecardId: scorecard.id,
      activityId: activity.id,
      year: scorecard.year,
      monthIndex: month.index,
      plannedValue: getInitialPlanValue(
        activity.unitOfMeasure,
        toNumber(activity.annualTarget),
      ),
      createdByUserId: actor.userId,
      updatedByUserId: actor.userId,
    })),
  );

  if (records.length === 0) {
    return {
      created: 0,
    };
  }

  const result = await prisma.monthlyPlan.createMany({
    data: records,
    skipDuplicates: true,
  });

  return {
    created: result.count,
  };
}

async function getActivityIdsForScorecard(scorecardId: string): Promise<Set<string>> {
  const activities = await prisma.activity.findMany({
    where: {
      objective: {
        perspective: {
          scorecardId,
        },
      },
    },
    select: {
      id: true,
    },
  });

  return new Set(activities.map((activity) => activity.id));
}

function assertActivitiesBelongToScorecard(
  values: MonthlyValueInput[],
  activityIds: Set<string>,
): void {
  for (const value of values) {
    if (!activityIds.has(value.activityId)) {
      throw new ScorecardServiceError(
        "One or more activities do not belong to this scorecard.",
        "FORBIDDEN",
      );
    }
  }
}

export async function saveMonthlyPlans(
  actor: ScorecardActor,
  scorecardId: string,
  values: MonthlyValueInput[],
): Promise<{ saved: number }> {
  assertAdmin(actor);

  const scorecard = await findScorecardForWorkspace(actor, scorecardId);
  const activityIds = await getActivityIdsForScorecard(scorecard.id);

  values.forEach(assertMonthlyValue);
  assertActivitiesBelongToScorecard(values, activityIds);

  await prisma.$transaction(
    values.map((value) =>
      prisma.monthlyPlan.upsert({
        where: {
          scorecardId_activityId_year_monthIndex: {
            scorecardId: scorecard.id,
            activityId: value.activityId,
            year: scorecard.year,
            monthIndex: value.monthIndex,
          },
        },
        create: {
          scorecardId: scorecard.id,
          activityId: value.activityId,
          year: scorecard.year,
          monthIndex: value.monthIndex,
          plannedValue: value.value,
          createdByUserId: actor.userId,
          updatedByUserId: actor.userId,
        },
        update: {
          plannedValue: value.value,
          updatedByUserId: actor.userId,
        },
      }),
    ),
  );

  return {
    saved: values.length,
  };
}

export async function saveMonthlyActuals(
  actor: ScorecardActor,
  scorecardId: string,
  values: MonthlyValueInput[],
): Promise<{ saved: number }> {
  const scorecard = await findScorecardForWorkspace(actor, scorecardId);
  const activityIds = await getActivityIdsForScorecard(scorecard.id);

  values.forEach(assertMonthlyValue);
  assertActivitiesBelongToScorecard(values, activityIds);

  await prisma.$transaction(
    values.map((value) => {
      const period = getFiscalPeriod(scorecard.year, value.monthIndex);

      return prisma.monthlyActual.upsert({
        where: {
          scorecardId_activityId_year_month: {
            scorecardId: scorecard.id,
            activityId: value.activityId,
            year: period.calendarYear,
            month: period.calendarMonth,
          },
        },
        create: {
          scorecardId: scorecard.id,
          activityId: value.activityId,
          year: period.calendarYear,
          month: period.calendarMonth,
          actualValue: value.value,
          createdByUserId: actor.userId,
          updatedByUserId: actor.userId,
        },
        update: {
          actualValue: value.value,
          updatedByUserId: actor.userId,
        },
      });
    }),
  );

  return {
    saved: values.length,
  };
}
