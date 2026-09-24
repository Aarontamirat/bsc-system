import type { UnitOfMeasure } from "@/generated/prisma/client";
import type {
  FiscalMonthIndex,
  PerformanceStatus,
} from "@/lib/bsc-calculations";

export type MonthlyValueInput = {
  activityId: string;
  monthIndex: number;
  value: number;
};

export type MonthlyActivityDto = {
  id: string;
  name: string;
  weight: number;
  unitOfMeasure: UnitOfMeasure;
  annualTarget: number;
  baseline: number;
  remark: string | null;
  responsibleUnits: string[];
  plans: number[];
  actuals: number[];
  annualPlan: number;
  annualActual: number;
  achievementPercent: number | null;
  weightedScore: number;
  status: PerformanceStatus;
};

export type MonthlyObjectiveDto = {
  id: string;
  name: string;
  weight: number;
  activities: MonthlyActivityDto[];
};

export type MonthlyPerspectiveDto = {
  id: string;
  name: string;
  weight: number;
  objectives: MonthlyObjectiveDto[];
};

export type ScorecardOptionDto = {
  id: string;
  departmentId: string;
  departmentName: string;
  year: number;
  label: string;
};

export type MonthlyWorkspaceDto = {
  months: {
    index: FiscalMonthIndex;
    calendarMonth: number;
    shortName: string;
    longName: string;
  }[];
  scorecards: ScorecardOptionDto[];
  selectedScorecard: ScorecardOptionDto | null;
  canEditPlans: boolean;
  canEditActuals: boolean;
  perspectives: MonthlyPerspectiveDto[];
};
