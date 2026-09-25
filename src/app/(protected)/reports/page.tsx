import React, { Fragment } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportExportButtons } from "@/components/reports/report-export-buttons";
import {
  aggregateFiscalMonthValues,
  calculateActivityPerformance,
  calculateScorecard,
  type FiscalMonthIndex,
} from "@/lib/bsc-calculations";
import { getScorecardActorOrRedirect } from "@/lib/scorecard-actor";
import { getMonthlyWorkspace } from "@/lib/services/monthly-data.service";
import {
  Award,
  Calendar,
  CheckCircle2,
  Filter,
  Layers,
  Target,
} from "lucide-react";

export const dynamic = "force-dynamic";

type ReportsPageProps = {
  searchParams: Promise<{
    scorecardId?: string;
    fromMonth?: string;
    toMonth?: string;
  }>;
};

type ReportRow = {
  perspective: string;
  objective: string;
  activity: string;
  unit: string;
  weight: number;
  baseline: number;
  responsibleUnits: string[];
  plans: number[];
  actuals: number[];
  plan: number;
  actual: number;
  achievement: number | null;
  score: number;
  status: "GREEN" | "YELLOW" | "RED" | "NO_PLAN";
};

function formatNumber(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
  }).format(value);
}

function parseMonth(value: string | undefined, fallback: number): number {
  const month = Number(value);
  return Number.isInteger(month) && month >= 0 && month <= 11
    ? month
    : fallback;
}

function getStatusBadge(status: ReportRow["status"]) {
  switch (status) {
    case "GREEN":
      return (
        <Badge
          variant="outline"
          className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
          Green
        </Badge>
      );
    case "YELLOW":
      return (
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
          Yellow
        </Badge>
      );
    case "RED":
      return (
        <Badge
          variant="outline"
          className="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400">
          Red
        </Badge>
      );
    case "NO_PLAN":
    default:
      return (
        <Badge
          variant="outline"
          className="border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          No Plan
        </Badge>
      );
  }
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const actor = await getScorecardActorOrRedirect();
  const params = await searchParams;
  const data = await getMonthlyWorkspace(actor, params.scorecardId);
  const fromMonth = parseMonth(params.fromMonth, 0);
  const toMonth = Math.max(fromMonth, parseMonth(params.toMonth, 11));
  const months = data.months.slice(fromMonth, toMonth + 1);
  const monthIndexes = months.map((month) => month.index) as FiscalMonthIndex[];

  const rows: ReportRow[] = data.perspectives.flatMap((perspective) =>
    perspective.objectives.flatMap((objective) =>
      objective.activities.map((activity) => {
        const plan = aggregateFiscalMonthValues(
          activity.unitOfMeasure,
          activity.plans.map((value, monthIndex) => ({
            monthIndex: monthIndex as FiscalMonthIndex,
            value,
          })),
          monthIndexes,
        );
        const actual = aggregateFiscalMonthValues(
          activity.unitOfMeasure,
          activity.actuals.map((value, monthIndex) => ({
            monthIndex: monthIndex as FiscalMonthIndex,
            value,
          })),
          monthIndexes,
        );
        const performance = calculateActivityPerformance({
          unitOfMeasure: activity.unitOfMeasure,
          weight: activity.weight,
          plan: plan.value,
          actual: actual.value,
        });

        return {
          perspective: perspective.name,
          objective: objective.name,
          activity: activity.name,
          unit: activity.unitOfMeasure,
          weight: activity.weight,
          baseline: activity.baseline,
          responsibleUnits: activity.responsibleUnits,
          plans: activity.plans,
          actuals: activity.actuals,
          plan: Number(plan.value),
          actual: Number(actual.value),
          achievement: performance.achievementPercent
            ? Number(performance.achievementPercent)
            : null,
          score: Number(performance.weightedScore),
          status: performance.status,
        };
      }),
    ),
  );

  let overallScore: number | null = null;

  try {
    overallScore = Number(
      calculateScorecard({
        perspectives: data.perspectives.map((perspective) => ({
          name: perspective.name,
          weight: perspective.weight,
          objectives: perspective.objectives.map((objective) => ({
            name: objective.name,
            weight: objective.weight,
            activities: objective.activities.map((activity) => {
              const row = rows.find((item) => item.activity === activity.name);
              return {
                unitOfMeasure: activity.unitOfMeasure,
                weight: activity.weight,
                plan: row?.plan ?? 0,
                actual: row?.actual ?? 0,
              };
            }),
          })),
        })),
      }).score,
    );
  } catch {
    overallScore = null;
  }

  const activeRows = rows.filter((row) => row.plan > 0);
  const actualCoverage = rows.filter((row) => row.actual > 0).length;
  const statusCounts = rows.reduce(
    (counts, row) => {
      counts[row.status] += 1;
      return counts;
    },
    { GREEN: 0, YELLOW: 0, RED: 0, NO_PLAN: 0 },
  );

  const groupedPerspectives = data.perspectives
    .map((p) => ({
      name: p.name,
      weight: p.weight,
      objectives: p.objectives
        .map((o) => ({
          name: o.name,
          rows: rows.filter(
            (r) => r.perspective === p.name && r.objective === o.name,
          ),
        }))
        .filter((o) => o.rows.length > 0),
    }))
    .filter((p) => p.objectives.length > 0);

  const scorecardLabel = data.selectedScorecard?.label ?? "Default Scorecard";
  const periodLabel = `${months[0]?.shortName ?? ""} – ${months.at(-1)?.shortName ?? ""}`;

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          eyebrow="Consolidated Reports"
          title="Scorecard Performance Report"
          description="Period-based departmental performance from persisted plans, actuals, achievements, and weighted scores."
        />
        <ReportExportButtons
          scorecardLabel={scorecardLabel}
          periodLabel={periodLabel}
          overallScore={overallScore}
          months={months}
          groupedPerspectives={groupedPerspectives}
        />
      </div>

      {/* FILTER BAR */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <form className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="scorecardId"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Scorecard
                </label>
                <select
                  id="scorecardId"
                  name="scorecardId"
                  defaultValue={data.selectedScorecard?.id ?? ""}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-xs outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950 dark:border-slate-700 dark:bg-slate-900">
                  {data.scorecards.map((scorecard) => (
                    <option key={scorecard.id} value={scorecard.id}>
                      {scorecard.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="fromMonth"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  From Month
                </label>
                <select
                  id="fromMonth"
                  name="fromMonth"
                  defaultValue={fromMonth}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-xs outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950 dark:border-slate-700 dark:bg-slate-900">
                  {data.months.map((month) => (
                    <option key={month.index} value={month.index}>
                      {month.longName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="toMonth"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  To Month
                </label>
                <select
                  id="toMonth"
                  name="toMonth"
                  defaultValue={toMonth}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-xs outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950 dark:border-slate-700 dark:bg-slate-900">
                  {data.months.map((month) => (
                    <option key={month.index} value={month.index}>
                      {month.longName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200">
                <Filter className="h-4 w-4" />
                Apply Filters
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!data.selectedScorecard ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-sm text-slate-500">
            No scorecard is available for reporting.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI STATS CARDS */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Overall Score
                </CardTitle>
                <Award className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-950 dark:text-white">
                  {formatNumber(overallScore)}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Weighted Scorecard Total
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Active Plans
                </CardTitle>
                <Target className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-950 dark:text-white">
                  {activeRows.length}{" "}
                  <span className="text-sm font-normal text-slate-400">
                    / {rows.length}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Activities with plan &gt; 0
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Actual Coverage
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-950 dark:text-white">
                  {actualCoverage}{" "}
                  <span className="text-sm font-normal text-slate-400">
                    / {rows.length}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Activities with actuals reported
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Report Period
                </CardTitle>
                <Calendar className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-slate-950 dark:text-white">
                  {periodLabel}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {months.length} month(s) selected
                </p>
              </CardContent>
            </Card>
          </div>

          {/* STATUS BREAKDOWN BADGES */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className="mr-1 text-slate-500">Status Summary:</span>
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center gap-1.5">
                {getStatusBadge(status as ReportRow["status"])}
                <span className="text-slate-600 dark:text-slate-400">
                  ({count})
                </span>
              </div>
            ))}
          </div>

          {/* PERFORMANCE DATA TABLE */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th
                    rowSpan={2}
                    className="p-3 font-semibold uppercase tracking-wider min-w-50">
                    Objective &amp; Activity
                  </th>
                  <th
                    rowSpan={2}
                    className="p-3 font-semibold uppercase tracking-wider">
                    Unit
                  </th>
                  <th
                    rowSpan={2}
                    className="p-3 text-right font-semibold uppercase tracking-wider">
                    Weight
                  </th>
                  <th
                    rowSpan={2}
                    className="p-3 text-right font-semibold uppercase tracking-wider">
                    Baseline
                  </th>

                  {months.map((month) => (
                    <th
                      key={month.index}
                      colSpan={2}
                      className="border-l border-slate-200 p-2 text-center font-semibold uppercase tracking-wider dark:border-slate-700">
                      {month.shortName}
                    </th>
                  ))}

                  <th
                    rowSpan={2}
                    className="border-l border-slate-200 p-3 text-right font-semibold uppercase tracking-wider dark:border-slate-700">
                    Plan
                  </th>
                  <th
                    rowSpan={2}
                    className="p-3 text-right font-semibold uppercase tracking-wider">
                    Actual
                  </th>
                  <th
                    rowSpan={2}
                    className="p-3 text-right font-semibold uppercase tracking-wider">
                    Achv %
                  </th>
                  <th
                    rowSpan={2}
                    className="p-3 text-right font-semibold uppercase tracking-wider">
                    Score
                  </th>
                  <th
                    rowSpan={2}
                    className="p-3 text-center font-semibold uppercase tracking-wider">
                    Status
                  </th>
                  <th
                    rowSpan={2}
                    className="p-3 font-semibold uppercase tracking-wider min-w-35">
                    Responsible
                  </th>
                </tr>
                <tr className="border-t border-slate-200 dark:border-slate-700">
                  {months.flatMap((month) => [
                    <th
                      key={`${month.index}:plan`}
                      className="border-l border-slate-200 px-2 py-1.5 text-right font-medium text-slate-500 dark:border-slate-700">
                      Plan
                    </th>,
                    <th
                      key={`${month.index}:actual`}
                      className="px-2 py-1.5 text-right font-medium text-slate-500">
                      Act
                    </th>,
                  ])}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {groupedPerspectives.map((perspective) => (
                  <Fragment key={perspective.name}>
                    <tr className="bg-slate-100/80 font-bold dark:bg-slate-800/60">
                      <td
                        colSpan={9 + months.length * 2}
                        className="px-3 py-2 text-sm text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-slate-500" />
                          <span>{perspective.name}</span>
                          <span className="text-xs font-normal text-slate-500">
                            (Weight: {perspective.weight}%)
                          </span>
                        </div>
                      </td>
                    </tr>

                    {perspective.objectives.map((obj) => (
                      <Fragment key={obj.name}>
                        <tr className="bg-slate-50/50 text-xs font-semibold text-slate-600 dark:bg-slate-900/50">
                          <td
                            colSpan={9 + months.length * 2}
                            className="px-4 py-1.5 italic text-slate-500 dark:text-slate-400">
                            Objective: {obj.name}
                          </td>
                        </tr>

                        {obj.rows.map((row) => (
                          <tr
                            key={row.activity}
                            className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40">
                            <td className="p-3 pl-6 font-medium text-slate-900 dark:text-slate-100">
                              {row.activity}
                            </td>

                            <td className="p-3">
                              <Badge
                                variant="outline"
                                className="text-[10px] font-normal">
                                {row.unit}
                              </Badge>
                            </td>

                            {/* Weight */}
                            <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">
                              {row.weight}%
                            </td>

                            {/* Baseline */}
                            <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">
                              {formatNumber(row.baseline)}
                            </td>

                            {months.flatMap((month) => [
                              <td
                                key={`${month.index}:plan`}
                                className="border-l border-slate-100 px-2 py-3 text-right font-mono text-slate-500 dark:border-slate-800">
                                {formatNumber(row.plans[month.index] ?? 0)}
                              </td>,
                              <td
                                key={`${month.index}:actual`}
                                className="px-2 py-3 text-right font-mono text-slate-900 dark:text-slate-100">
                                {formatNumber(row.actuals[month.index] ?? 0)}
                              </td>,
                            ])}

                            <td className="border-l border-slate-200 p-3 text-right font-mono font-semibold text-slate-900 dark:border-slate-700 dark:text-slate-100">
                              {formatNumber(row.plan)}
                            </td>

                            <td className="p-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                              {formatNumber(row.actual)}
                            </td>

                            <td className="p-3 text-right font-mono font-semibold">
                              {row.achievement === null
                                ? "—"
                                : `${formatNumber(row.achievement)}%`}
                            </td>

                            <td className="p-3 text-right font-mono font-bold text-slate-950 dark:text-white">
                              {formatNumber(row.score)}
                            </td>

                            <td className="p-3 text-center">
                              {getStatusBadge(row.status)}
                            </td>

                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {row.responsibleUnits.length > 0 ? (
                                  row.responsibleUnits.map((unit) => (
                                    <span
                                      key={unit}
                                      className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                      {unit}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
