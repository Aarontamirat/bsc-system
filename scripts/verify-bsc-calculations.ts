import assert from "node:assert/strict";

import {
  calculateActivityPerformance,
  calculateObjectiveScore,
  calculatePerspectiveScore,
  calculateScorecard,
  aggregateFiscalMonthValues,
  fiscalRange,
  getFiscalMonthIndexFromCalendarMonth,
  getFiscalPeriod,
  getFiscalYearFromCalendarDate,
  getPerformanceStatus,
} from "../src/lib/bsc-calculations";

const PERCENT = "PERCENT" as const;
const COUNT = "COUNT" as const;

function assertDecimalEqual(
  actual: { toString(): string },
  expected: string,
  message: string,
): void {
  assert.equal(actual.toString(), expected, message);
}

/**
 * Fiscal mapping
 */
{
  const july2026 = getFiscalPeriod(2026, 0);

  assert.equal(july2026.calendarYear, 2026);
  assert.equal(july2026.calendarMonth, 7);
  assert.equal(july2026.longName, "July");

  const january2027 = getFiscalPeriod(2026, 6);

  assert.equal(january2027.calendarYear, 2027);
  assert.equal(january2027.calendarMonth, 1);
  assert.equal(january2027.longName, "January");

  assert.equal(getFiscalMonthIndexFromCalendarMonth(7), 0);

  assert.equal(getFiscalMonthIndexFromCalendarMonth(1), 6);

  assert.equal(getFiscalYearFromCalendarDate(2027, 1), 2026);

  assert.equal(getFiscalYearFromCalendarDate(2026, 7), 2026);
}

/**
 * Fiscal ranges
 */
{
  assert.deepEqual(fiscalRange(0, 2), [0, 1, 2]);

  assert.deepEqual(fiscalRange(10, 1), [10, 11, 0, 1]);
}

/**
 * Percentage average
 */
{
  const result = aggregateFiscalMonthValues(
    PERCENT,
    [
      { monthIndex: 0, value: "80" },
      { monthIndex: 1, value: "90" },
      { monthIndex: 2, value: "100" },
    ],
    [0, 1, 2],
  );

  assert.equal(result.method, "AVERAGE");

  assertDecimalEqual(result.value, "90", "Percentage average should equal 90.");

  assert.equal(result.sampleCount, 3);
  assert.equal(result.missingCount, 0);
}

/**
 * Sum unit
 */
{
  const result = aggregateFiscalMonthValues(
    COUNT,
    [
      { monthIndex: 0, value: "10" },
      { monthIndex: 1, value: "15" },
      { monthIndex: 2, value: "20" },
    ],
    [0, 1, 2],
  );

  assert.equal(result.method, "SUM");

  assertDecimalEqual(result.value, "45", "Count aggregation should equal 45.");
}

/**
 * Missing-month detection
 */
{
  const result = aggregateFiscalMonthValues(
    COUNT,
    [
      { monthIndex: 0, value: "10" },
      { monthIndex: 2, value: "30" },
    ],
    [0, 1, 2],
  );

  assert.equal(result.sampleCount, 2);
  assert.equal(result.expectedCount, 3);
  assert.equal(result.missingCount, 1);
  assert.deepEqual(result.missingMonthIndexes, [1]);

  assertDecimalEqual(
    result.value,
    "40",
    "Available count values should sum to 40.",
  );
}

/**
 * Activity calculation
 *
 * Plan = 100
 * Actual = 120
 * Achievement = 120%
 * Weight = 25%
 * Weighted score = 30
 */
{
  const result = calculateActivityPerformance({
    unitOfMeasure: COUNT,
    weight: "25",
    plan: "100",
    actual: "120",
  });

  assertDecimalEqual(
    result.achievementPercent!,
    "120",
    "Achievement should equal 120%.",
  );

  assertDecimalEqual(
    result.weightedScore,
    "30",
    "Activity weighted score should equal 30.",
  );

  assert.equal(result.status, "GREEN");
}

/**
 * Performance bands
 */
{
  assert.equal(getPerformanceStatus("100"), "GREEN");

  assert.equal(getPerformanceStatus("99.9999"), "YELLOW");

  assert.equal(getPerformanceStatus("80"), "YELLOW");

  assert.equal(getPerformanceStatus("79.9999"), "RED");

  assert.equal(getPerformanceStatus(null), "NO_PLAN");
}

/**
 * Objective calculation
 *
 * Two activities:
 *
 * Activity A:
 *   weight 40%
 *   achievement 100%
 *   contribution 40
 *
 * Activity B:
 *   weight 60%
 *   achievement 50%
 *   contribution 30
 *
 * Objective Score = 70
 *
 * Objective Weight = 50%
 *
 * Objective contribution to perspective = 35
 */
{
  const result = calculateObjectiveScore({
    name: "Customer Service Objective",
    weight: "50",
    activities: [
      {
        unitOfMeasure: COUNT,
        weight: "40",
        plan: "100",
        actual: "100",
      },
      {
        unitOfMeasure: COUNT,
        weight: "60",
        plan: "100",
        actual: "50",
      },
    ],
  });

  assertDecimalEqual(
    result.score,
    "70",
    "Objective raw score should equal 70.",
  );

  assertDecimalEqual(
    result.weightedScore,
    "35",
    "Objective weighted contribution should equal 35.",
  );
}

/**
 * Perspective calculation
 */
{
  const result = calculatePerspectiveScore({
    name: "Financial Perspective",
    weight: "50",
    objectives: [
      {
        weight: "50",
        activities: [
          {
            unitOfMeasure: COUNT,
            weight: "100",
            plan: "100",
            actual: "100",
          },
        ],
      },
      {
        weight: "50",
        activities: [
          {
            unitOfMeasure: COUNT,
            weight: "100",
            plan: "100",
            actual: "60",
          },
        ],
      },
    ],
  });

  assertDecimalEqual(result.score, "80", "Perspective score should equal 80.");

  assertDecimalEqual(
    result.weightedScore,
    "40",
    "Perspective contribution should equal 40.",
  );
}

/**
 * Complete scorecard
 *
 * Perspective A:
 *   score = 80
 *   weight = 50
 *   contribution = 40
 *
 * Perspective B:
 *   score = 60
 *   weight = 50
 *   contribution = 30
 *
 * Grand score = 70
 */
{
  const result = calculateScorecard({
    perspectives: [
      {
        name: "Financial",
        weight: "50",
        objectives: [
          {
            weight: "100",
            activities: [
              {
                unitOfMeasure: COUNT,
                weight: "100",
                plan: "100",
                actual: "80",
              },
            ],
          },
        ],
      },
      {
        name: "Customer",
        weight: "50",
        objectives: [
          {
            weight: "100",
            activities: [
              {
                unitOfMeasure: COUNT,
                weight: "100",
                plan: "100",
                actual: "60",
              },
            ],
          },
        ],
      },
    ],
  });

  assertDecimalEqual(result.score, "70", "Overall score should equal 70.");
}

/**
 * Zero-plan handling
 */
{
  const result = calculateActivityPerformance({
    unitOfMeasure: COUNT,
    weight: "100",
    plan: "0",
    actual: "25",
  });

  assert.equal(result.achievementPercent, null);

  assertDecimalEqual(
    result.weightedScore,
    "0",
    "An activity without a plan must not generate a score.",
  );

  assert.equal(result.status, "NO_PLAN");
}

console.log("BSC calculation verification completed successfully.");
