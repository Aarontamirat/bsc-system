import Decimal from "decimal.js";
import type { UnitOfMeasure } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma";

/**
 * BSC numerical policy
 *
 * All internal calculations use Decimal arithmetic.
 * No score is converted to JavaScript number until a presentation
 * layer explicitly asks for one.
 */
Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
});

export const HUNDRED = new Decimal("100");
export const ZERO = new Decimal("0");

export const PERFORMANCE_THRESHOLDS = {
  GREEN: new Decimal("100"),
  YELLOW: new Decimal("80"),
} as const;

export type FiscalMonthIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type CalendarMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type DecimalInput = Prisma.Decimal | number | string | null | undefined;

export type PerformanceStatus = "GREEN" | "YELLOW" | "RED" | "NO_PLAN";

export interface FiscalMonthDefinition {
  readonly index: FiscalMonthIndex;
  readonly calendarMonth: CalendarMonth;
  readonly shortName: string;
  readonly longName: string;
}

export const FISCAL_MONTHS: readonly FiscalMonthDefinition[] = [
  {
    index: 0,
    calendarMonth: 7,
    shortName: "Jul",
    longName: "July",
  },
  {
    index: 1,
    calendarMonth: 8,
    shortName: "Aug",
    longName: "August",
  },
  {
    index: 2,
    calendarMonth: 9,
    shortName: "Sep",
    longName: "September",
  },
  {
    index: 3,
    calendarMonth: 10,
    shortName: "Oct",
    longName: "October",
  },
  {
    index: 4,
    calendarMonth: 11,
    shortName: "Nov",
    longName: "November",
  },
  {
    index: 5,
    calendarMonth: 12,
    shortName: "Dec",
    longName: "December",
  },
  {
    index: 6,
    calendarMonth: 1,
    shortName: "Jan",
    longName: "January",
  },
  {
    index: 7,
    calendarMonth: 2,
    shortName: "Feb",
    longName: "February",
  },
  {
    index: 8,
    calendarMonth: 3,
    shortName: "Mar",
    longName: "March",
  },
  {
    index: 9,
    calendarMonth: 4,
    shortName: "Apr",
    longName: "April",
  },
  {
    index: 10,
    calendarMonth: 5,
    shortName: "May",
    longName: "May",
  },
  {
    index: 11,
    calendarMonth: 6,
    shortName: "Jun",
    longName: "June",
  },
] as const;

export const SUM_UNITS = ["COUNT", "NUMBER", "MINUTE", "HOUR"] as const;

export const AVERAGE_UNITS = ["PERCENT"] as const;

export type AggregationMethod = "SUM" | "AVERAGE";

export interface FiscalPeriod {
  fiscalYear: number;
  monthIndex: FiscalMonthIndex;
  calendarYear: number;
  calendarMonth: CalendarMonth;
  shortName: string;
  longName: string;
}

export interface FiscalMonthValue {
  monthIndex: FiscalMonthIndex;
  value: DecimalInput;
}

export interface MonthlyPlanPoint {
  year: number;
  monthIndex: number;
  plannedValue: DecimalInput;
}

export interface MonthlyActualPoint {
  year: number;
  month: number;
  actualValue: DecimalInput;
}

export interface MonthlyAggregation {
  unitOfMeasure: UnitOfMeasure;
  method: AggregationMethod;
  value: Decimal;
  sampleCount: number;
  expectedCount: number;
  missingCount: number;
  missingMonthIndexes: FiscalMonthIndex[];
}

export interface ActivityPerformanceInput {
  unitOfMeasure: UnitOfMeasure;
  weight: DecimalInput;
  plan: DecimalInput;
  actual: DecimalInput;
}

export interface ActivityPerformanceResult {
  plan: Decimal;
  actual: Decimal;
  weight: Decimal;
  achievementPercent: Decimal | null;
  weightedScore: Decimal;
  status: PerformanceStatus;
}

export interface ObjectiveScoreInput {
  name?: string;
  weight: DecimalInput;
  activities: ActivityPerformanceInput[];
}

export interface ObjectiveScoreResult {
  name?: string;
  weight: Decimal;
  score: Decimal;
  weightedScore: Decimal;
  activities: ActivityPerformanceResult[];
}

export interface PerspectiveScoreInput {
  name?: string;
  weight: DecimalInput;
  objectives: ObjectiveScoreInput[];
}

export interface PerspectiveScoreResult {
  name?: string;
  weight: Decimal;
  score: Decimal;
  weightedScore: Decimal;
  objectives: ObjectiveScoreResult[];
}

export interface ScorecardCalculationInput {
  perspectives: PerspectiveScoreInput[];
}

export interface ScorecardCalculationResult {
  score: Decimal;
  perspectives: PerspectiveScoreResult[];
}

export function toDecimal(value: DecimalInput): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  if (value === null || value === undefined) {
    return new Prisma.Decimal(0);
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error("Numeric BSC values must be finite.");
  }

  try {
    return new Prisma.Decimal(value);
  } catch {
    throw new Error(`Invalid decimal value: ${String(value)}`);
  }
}

export function toDisplayDecimal(
  value: DecimalInput,
  decimalPlaces = 2,
): string {
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0) {
    throw new Error("decimalPlaces must be a non-negative integer.");
  }

  return toDecimal(value).toFixed(decimalPlaces);
}

export function validateWeight(
  weight: DecimalInput,
  label = "Weight",
): Decimal {
  const decimalWeight = toDecimal(weight);

  if (decimalWeight.lessThan(ZERO)) {
    throw new Error(`${label} cannot be negative.`);
  }

  if (decimalWeight.greaterThan(HUNDRED)) {
    throw new Error(`${label} cannot exceed 100%.`);
  }

  return decimalWeight;
}

export function sumDecimals(values: DecimalInput[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>(
    (sum, value) => sum.plus(toDecimal(value)),
    new Prisma.Decimal(0),
  );
}

export interface WeightValidationResult {
  total: Decimal;
  difference: Decimal;
  valid: boolean;
}

export function validateWeights(
  weights: readonly DecimalInput[],
): WeightValidationResult {
  const normalized = weights.map((weight) => validateWeight(weight));

  const total = sumDecimals(normalized);
  const difference = total.minus(HUNDRED);

  return {
    total,
    difference,
    valid: difference.isZero(),
  };
}

export function assertWeightsSumTo100(
  weights: readonly DecimalInput[],
  hierarchyName: string,
): void {
  if (weights.length === 0) {
    throw new Error(`${hierarchyName} must contain at least one item.`);
  }

  const result = validateWeights(weights);

  if (!result.valid) {
    throw new Error(
      `${hierarchyName} weights must total exactly 100%. Current total: ${result.total.toFixed(4)}%.`,
    );
  }
}

export function isValidFiscalMonthIndex(
  value: number,
): value is FiscalMonthIndex {
  return Number.isInteger(value) && value >= 0 && value <= 11;
}

export function isValidCalendarMonth(value: number): value is CalendarMonth {
  return Number.isInteger(value) && value >= 1 && value <= 12;
}

export function assertValidFiscalMonthIndex(
  value: number,
): asserts value is FiscalMonthIndex {
  if (!isValidFiscalMonthIndex(value)) {
    throw new Error(
      `Invalid fiscal month index: ${value}. Expected an integer from 0 to 11.`,
    );
  }
}

export function assertValidCalendarMonth(
  value: number,
): asserts value is CalendarMonth {
  if (!isValidCalendarMonth(value)) {
    throw new Error(
      `Invalid calendar month: ${value}. Expected an integer from 1 to 12.`,
    );
  }
}

export function assertValidFiscalYear(year: number): void {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(
      `Invalid fiscal year: ${year}. Expected an integer from 2000 to 2100.`,
    );
  }
}

export function getCurrentFiscalYear(date: Date = new Date()): number {
  const calendarYear = date.getFullYear();
  const calendarMonth = date.getMonth() + 1;

  return calendarMonth >= 7 ? calendarYear : calendarYear - 1;
}

/**
 * Converts:
 *
 * fiscal year 2026 + index 0 -> July 2026
 * fiscal year 2026 + index 6 -> January 2027
 */
export function getFiscalPeriod(
  fiscalYear: number,
  monthIndex: number,
): FiscalPeriod {
  assertValidFiscalYear(fiscalYear);
  assertValidFiscalMonthIndex(monthIndex);

  const definition = FISCAL_MONTHS[monthIndex];

  const calendarYear = monthIndex <= 5 ? fiscalYear : fiscalYear + 1;

  return {
    fiscalYear,
    monthIndex,
    calendarYear,
    calendarMonth: definition.calendarMonth,
    shortName: definition.shortName,
    longName: definition.longName,
  };
}

export function getFiscalMonthIndexFromCalendarMonth(
  month: number,
): FiscalMonthIndex {
  assertValidCalendarMonth(month);

  if (month >= 7) {
    return (month - 7) as FiscalMonthIndex;
  }

  return (month + 5) as FiscalMonthIndex;
}

export function getFiscalYearFromCalendarDate(
  calendarYear: number,
  calendarMonth: number,
): number {
  assertValidCalendarMonth(calendarMonth);

  return calendarMonth >= 7 ? calendarYear : calendarYear - 1;
}

export function fiscalRange(
  startIndex: number,
  endIndex: number,
): FiscalMonthIndex[] {
  assertValidFiscalMonthIndex(startIndex);
  assertValidFiscalMonthIndex(endIndex);

  const result: FiscalMonthIndex[] = [];

  let current = startIndex;

  while (true) {
    result.push(current as FiscalMonthIndex);

    if (current === endIndex) {
      break;
    }

    current = (current + 1) % 12;
  }

  return result;
}

export function getAggregationMethod(
  unitOfMeasure: UnitOfMeasure,
): AggregationMethod {
  if (SUM_UNITS.includes(String(unitOfMeasure) as (typeof SUM_UNITS)[number])) {
    return "SUM";
  }

  if (
    AVERAGE_UNITS.includes(
      String(unitOfMeasure) as (typeof AVERAGE_UNITS)[number],
    )
  ) {
    return "AVERAGE";
  }

  throw new Error(`Unsupported unit of measure: ${String(unitOfMeasure)}`);
}

function normalizeFiscalMonthValues(
  values: readonly FiscalMonthValue[],
): FiscalMonthValue[] {
  const seen = new Set<number>();
  const normalized: FiscalMonthValue[] = [];

  for (const point of values) {
    assertValidFiscalMonthIndex(point.monthIndex);

    if (seen.has(point.monthIndex)) {
      throw new Error(
        `Duplicate value detected for fiscal month index ${point.monthIndex}.`,
      );
    }

    seen.add(point.monthIndex);

    const value = toDecimal(point.value);

    if (value.lessThan(ZERO)) {
      throw new Error(`BSC monthly values cannot be negative.`);
    }

    normalized.push({
      monthIndex: point.monthIndex,
      value,
    });
  }

  return normalized;
}

export function aggregateFiscalMonthValues(
  unitOfMeasure: UnitOfMeasure,
  values: readonly FiscalMonthValue[],
  selectedMonthIndexes: readonly FiscalMonthIndex[],
): MonthlyAggregation {
  if (selectedMonthIndexes.length === 0) {
    throw new Error("At least one fiscal month must be selected.");
  }

  const method = getAggregationMethod(unitOfMeasure);

  const selected = new Set<number>(selectedMonthIndexes);

  const normalized = normalizeFiscalMonthValues(values);

  const selectedValues = normalized.filter((point) =>
    selected.has(point.monthIndex),
  );

  const selectedIndexes = [...selectedMonthIndexes];

  const missingMonthIndexes = selectedIndexes.filter(
    (monthIndex) =>
      !selectedValues.some((point) => point.monthIndex === monthIndex),
  );

  let value = ZERO;

  if (method === "SUM") {
    value = sumDecimals(selectedValues.map((point) => point.value));
  } else if (selectedValues.length > 0) {
    value = sumDecimals(selectedValues.map((point) => point.value)).div(
      selectedValues.length,
    );
  }

  return {
    unitOfMeasure,
    method,
    value,
    sampleCount: selectedValues.length,
    expectedCount: selectedIndexes.length,
    missingCount: missingMonthIndexes.length,
    missingMonthIndexes,
  };
}

export function aggregateMonthlyPlans(
  fiscalYear: number,
  unitOfMeasure: UnitOfMeasure,
  plans: readonly MonthlyPlanPoint[],
  selectedMonthIndexes: readonly FiscalMonthIndex[],
): MonthlyAggregation {
  assertValidFiscalYear(fiscalYear);

  const fiscalValues: FiscalMonthValue[] = plans.map((plan) => {
    if (plan.year !== fiscalYear) {
      throw new Error(
        `Monthly plan year ${plan.year} does not belong to fiscal year ${fiscalYear}.`,
      );
    }

    assertValidFiscalMonthIndex(plan.monthIndex);

    return {
      monthIndex: plan.monthIndex,
      value: plan.plannedValue,
    };
  });

  return aggregateFiscalMonthValues(
    unitOfMeasure,
    fiscalValues,
    selectedMonthIndexes,
  );
}

export function aggregateMonthlyActuals(
  fiscalYear: number,
  unitOfMeasure: UnitOfMeasure,
  actuals: readonly MonthlyActualPoint[],
  selectedMonthIndexes: readonly FiscalMonthIndex[],
): MonthlyAggregation {
  assertValidFiscalYear(fiscalYear);

  const fiscalValues: FiscalMonthValue[] = actuals.map((actual) => {
    assertValidCalendarMonth(actual.month);

    const derivedFiscalYear = getFiscalYearFromCalendarDate(
      actual.year,
      actual.month,
    );

    if (derivedFiscalYear !== fiscalYear) {
      throw new Error(
        `Monthly actual ${actual.year}-${String(actual.month).padStart(2, "0")} does not belong to fiscal year ${fiscalYear}.`,
      );
    }

    return {
      monthIndex: getFiscalMonthIndexFromCalendarMonth(actual.month),
      value: actual.actualValue,
    };
  });

  return aggregateFiscalMonthValues(
    unitOfMeasure,
    fiscalValues,
    selectedMonthIndexes,
  );
}

/**
 * Activity achievement:
 *
 * Achievement % = Actual / Plan * 100
 *
 * When Plan = 0, the mathematical result is undefined.
 * We therefore return null and NO_PLAN rather than inventing
 * an infinite or artificial performance percentage.
 */
export function calculateActivityPerformance(
  input: ActivityPerformanceInput,
): ActivityPerformanceResult {
  const plan = toDecimal(input.plan);
  const actual = toDecimal(input.actual);
  const weight = validateWeight(input.weight, "Activity weight");

  if (plan.lessThan(ZERO) || actual.lessThan(ZERO)) {
    throw new Error("Plan and actual values cannot be negative.");
  }

  if (plan.isZero()) {
    return {
      plan,
      actual,
      weight,
      achievementPercent: null,
      weightedScore: ZERO,
      status: "NO_PLAN",
    };
  }

  const achievementPercent = actual.div(plan).mul(HUNDRED);

  const weightedScore = achievementPercent.div(HUNDRED).mul(weight);

  return {
    plan,
    actual,
    weight,
    achievementPercent,
    weightedScore,
    status: getPerformanceStatus(achievementPercent),
  };
}

export function getPerformanceStatus(
  achievementPercent: DecimalInput | null,
): PerformanceStatus {
  if (achievementPercent === null) {
    return "NO_PLAN";
  }

  const achievement = toDecimal(achievementPercent);

  if (achievement.greaterThanOrEqualTo(PERFORMANCE_THRESHOLDS.GREEN)) {
    return "GREEN";
  }

  if (achievement.greaterThanOrEqualTo(PERFORMANCE_THRESHOLDS.YELLOW)) {
    return "YELLOW";
  }

  return "RED";
}

/**
 * Objective calculation:
 *
 * Activity Weighted Score =
 *     Achievement / 100 * Activity Weight
 *
 * Objective Score =
 *     SUM(Activity Weighted Scores)
 *
 * Objective Contribution to Perspective =
 *     Objective Score / 100 * Objective Weight
 *
 * The last step is essential. Without it, the prototype's
 * Objective Weight has no effect on the final score.
 */
export function calculateObjectiveScore(
  input: ObjectiveScoreInput,
): ObjectiveScoreResult {
  const weight = validateWeight(input.weight, "Objective weight");

  assertWeightsSumTo100(
    input.activities.map((activity) => activity.weight),
    "Activity",
  );

  const activities = input.activities.map(calculateActivityPerformance);

  const score = sumDecimals(
    activities.map((activity) => activity.weightedScore),
  );

  const weightedScore = score.div(HUNDRED).mul(weight);

  return {
    name: input.name,
    weight,
    score,
    weightedScore,
    activities,
  };
}

export function calculatePerspectiveScore(
  input: PerspectiveScoreInput,
): PerspectiveScoreResult {
  const weight = validateWeight(input.weight, "Perspective weight");

  assertWeightsSumTo100(
    input.objectives.map((objective) => objective.weight),
    "Objective",
  );

  const objectives = input.objectives.map(calculateObjectiveScore);

  const score = sumDecimals(
    objectives.map((objective) => objective.weightedScore),
  );

  const weightedScore = score.div(HUNDRED).mul(weight);

  return {
    name: input.name,
    weight,
    score,
    weightedScore,
    objectives,
  };
}

export function calculateScorecard(
  input: ScorecardCalculationInput,
): ScorecardCalculationResult {
  assertWeightsSumTo100(
    input.perspectives.map((perspective) => perspective.weight),
    "Perspective",
  );

  const perspectives = input.perspectives.map(calculatePerspectiveScore);

  const score = sumDecimals(
    perspectives.map((perspective) => perspective.weightedScore),
  );

  return {
    score,
    perspectives,
  };
}
