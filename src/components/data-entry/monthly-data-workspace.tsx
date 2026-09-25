"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  CircleAlert,
  Edit3,
  Eye,
  Loader2,
  RefreshCcw,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  MonthlyActivityDto,
  MonthlyValueInput,
  MonthlyWorkspaceDto,
} from "@/lib/monthly-data-types";
import {
  initializeMonthlyPlansAction,
  saveMonthlyActualsAction,
  saveMonthlyPlansAction,
} from "@/app/actions/monthly-data";

type ValueMode = "plans" | "actuals";

type Props = {
  initialData: MonthlyWorkspaceDto;
};

function activityValuesKey(activityId: string, mode: ValueMode): string {
  return `${mode}:${activityId}`;
}

function buildValueState(data: MonthlyWorkspaceDto, mode: ValueMode) {
  const values = new Map<string, number[]>();

  for (const perspective of data.perspectives) {
    for (const objective of perspective.objectives) {
      for (const activity of objective.activities) {
        values.set(activityValuesKey(activity.id, mode), [...activity[mode]]);
      }
    }
  }

  return values;
}

function flattenActivities(data: MonthlyWorkspaceDto): MonthlyActivityDto[] {
  return data.perspectives.flatMap((perspective) =>
    perspective.objectives.flatMap((objective) => objective.activities),
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return "No plan";
  }

  return `${formatNumber(value)}%`;
}

function statusClasses(status: MonthlyActivityDto["status"]): string {
  switch (status) {
    case "GREEN":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400";
    case "YELLOW":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-400";
    case "NO_PLAN":
      return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400";
    default:
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400";
  }
}

export function MonthlyDataWorkspace({ initialData }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [planValues, setPlanValues] = useState(() =>
    buildValueState(initialData, "plans"),
  );
  const [actualValues, setActualValues] = useState(() =>
    buildValueState(initialData, "actuals"),
  );

  const activities = useMemo(
    () => flattenActivities(initialData),
    [initialData],
  );

  // Unsaved changes tracking
  const isPlansDirty = useMemo(() => {
    const initialPlans = buildValueState(initialData, "plans");
    for (const [key, values] of planValues.entries()) {
      const initial = initialPlans.get(key);
      if (!initial || values.some((v, i) => v !== initial[i])) return true;
    }
    return false;
  }, [planValues, initialData]);

  const isActualsDirty = useMemo(() => {
    const initialActuals = buildValueState(initialData, "actuals");
    for (const [key, values] of actualValues.entries()) {
      const initial = initialActuals.get(key);
      if (!initial || values.some((v, i) => v !== initial[i])) return true;
    }
    return false;
  }, [actualValues, initialData]);

  function updateValue(
    mode: ValueMode,
    activityId: string,
    monthIndex: number,
    rawValue: string,
  ) {
    const numericValue = rawValue === "" ? 0 : Number(rawValue);
    const setter = mode === "plans" ? setPlanValues : setActualValues;

    if (!Number.isFinite(numericValue) || numericValue < 0) {
      return;
    }

    setter((current) => {
      const next = new Map(current);
      const key = activityValuesKey(activityId, mode);
      const values = [
        ...(next.get(key) ?? Array.from({ length: 12 }, () => 0)),
      ];
      values[monthIndex] = numericValue;
      next.set(key, values);
      return next;
    });
  }

  function collectValues(mode: ValueMode): MonthlyValueInput[] {
    const source = mode === "plans" ? planValues : actualValues;

    return activities.flatMap((activity) => {
      const values =
        source.get(activityValuesKey(activity.id, mode)) ??
        Array.from({ length: 12 }, () => 0);

      return values.map((value, monthIndex) => ({
        activityId: activity.id,
        monthIndex,
        value,
      }));
    });
  }

  function changeScorecard(scorecardId: string | null) {
    if (!scorecardId) {
      return;
    }

    router.push(`/data-entry?scorecardId=${scorecardId}`);
  }

  function initializePlans() {
    const scorecardId = initialData.selectedScorecard?.id;

    if (!scorecardId) {
      return;
    }

    startTransition(async () => {
      const result = await initializeMonthlyPlansAction(scorecardId);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  }

  function saveValues(mode: ValueMode) {
    const scorecardId = initialData.selectedScorecard?.id;

    if (!scorecardId) {
      return;
    }

    startTransition(async () => {
      const result =
        mode === "plans"
          ? await saveMonthlyPlansAction({
              scorecardId,
              values: collectValues("plans"),
            })
          : await saveMonthlyActualsAction({
              scorecardId,
              values: collectValues("actuals"),
            });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  }

  if (initialData.scorecards.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
          <CircleAlert className="h-10 w-10 text-slate-400" />
          <h2 className="mt-4 text-lg font-semibold">
            No scorecards available
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Create and validate a departmental scorecard before entering monthly
            plans or actual performance.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalTableColumns = initialData.months.length + 9;

  return (
    <div className="space-y-6">
      {/* Top Header & Department Selection Card */}
      <Card className="shadow-xs border-slate-200 dark:border-slate-800">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Monthly Data Workspace
            </p>
            <h2 className="mt-1 truncate text-2xl font-bold tracking-tight">
              {initialData.selectedScorecard?.label ?? "Select Scorecard"}
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Scorecard Dropdown with Fix */}
            <Select
              value={initialData.selectedScorecard?.id ?? ""}
              onValueChange={changeScorecard}>
              <SelectTrigger className="w-full sm:w-80 font-medium">
                <SelectValue placeholder="Select scorecard">
                  {initialData.selectedScorecard?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="z-50 shadow-lg rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1">
                {initialData.scorecards.map((scorecard) => (
                  <SelectItem
                    key={scorecard.id}
                    value={scorecard.id}
                    className="cursor-pointer rounded-sm px-2.5 py-2 text-sm focus:bg-slate-100 dark:focus:bg-slate-800">
                    {scorecard.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {initialData.canEditPlans ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={initializePlans}
                className="gap-2">
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4 text-slate-500" />
                )}
                Initialize plans
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* KPI Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-slate-500">
              Total Activities
            </CardTitle>
            <Activity className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activities.length}</div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-slate-500">
              Plan Editing
            </CardTitle>
            {initialData.canEditPlans ? (
              <Edit3 className="h-4 w-4 text-blue-500" />
            ) : (
              <Eye className="h-4 w-4 text-slate-400" />
            )}
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Badge
              variant={initialData.canEditPlans ? "default" : "secondary"}
              className={
                initialData.canEditPlans ? "bg-blue-600 hover:bg-blue-700" : ""
              }>
              {initialData.canEditPlans ? "Admin Enabled" : "View Only"}
            </Badge>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-slate-500">
              Actual Editing
            </CardTitle>
            {initialData.canEditActuals ? (
              <Sparkles className="h-4 w-4 text-emerald-500" />
            ) : (
              <Eye className="h-4 w-4 text-slate-400" />
            )}
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Badge
              variant={initialData.canEditActuals ? "default" : "secondary"}
              className={
                initialData.canEditActuals
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : ""
              }>
              {initialData.canEditActuals ? "Enabled" : "View Only"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {initialData.canEditPlans ? (
          <Button
            type="button"
            variant={isPlansDirty ? "default" : "outline"}
            disabled={pending}
            onClick={() => saveValues("plans")}
            className="gap-2">
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save plans
            {isPlansDirty ? (
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            ) : null}
          </Button>
        ) : null}

        <Button
          type="button"
          disabled={pending || !initialData.canEditActuals}
          onClick={() => saveValues("actuals")}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Save actuals
          {isActualsDirty ? (
            <span className="h-2 w-2 rounded-full bg-amber-300 animate-pulse" />
          ) : null}
        </Button>
      </div>

      {/* Workspace Data Table */}
      <div className="max-h-[75vh] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full border-collapse text-sm min-w-max">
          <thead className="sticky top-0 z-20 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-md text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="sticky top-0 left-0 z-30 w-72 bg-slate-100 dark:bg-slate-800 px-3 py-3 text-left border-r border-slate-200 dark:border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                Activity
              </th>
              <th className="px-3 py-3 text-left border-r border-slate-200 dark:border-slate-700">
                Unit
              </th>
              <th className="px-3 py-3 text-right border-r border-slate-200 dark:border-slate-700">
                Weight
              </th>
              <th className="px-2 py-3 text-center border-r border-slate-200 dark:border-slate-700">
                Type
              </th>
              {initialData.months.map((month) => (
                <th
                  key={month.index}
                  className="px-2 py-3 text-right border-r border-slate-200 dark:border-slate-700 min-w-24">
                  {month.shortName}
                </th>
              ))}
              <th className="px-3 py-3 text-right border-r border-slate-200 dark:border-slate-700 min-w-28">
                Annual plan
              </th>
              <th className="px-3 py-3 text-right border-r border-slate-200 dark:border-slate-700 min-w-28">
                Annual actual
              </th>
              <th className="px-3 py-3 text-right border-r border-slate-200 dark:border-slate-700">
                Achievement
              </th>
              <th className="px-3 py-3 text-right border-r border-slate-200 dark:border-slate-700">
                Score
              </th>
              <th className="px-3 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {initialData.perspectives.map((perspective) => (
              <tr
                key={perspective.id}
                className="border-t border-slate-200 dark:border-slate-800 bg-slate-200/60 dark:bg-slate-800/60 font-semibold text-slate-800 dark:text-slate-200">
                <td colSpan={totalTableColumns} className="px-3 py-2.5">
                  {perspective.name} ({formatNumber(perspective.weight)}%)
                </td>
              </tr>
            ))}
            {initialData.perspectives.flatMap((perspective) =>
              perspective.objectives.flatMap((objective) => [
                <tr
                  key={objective.id}
                  className="border-t border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 font-medium">
                  <td colSpan={totalTableColumns} className="px-3 py-2 pl-6">
                    {objective.name} ({formatNumber(objective.weight)}%)
                  </td>
                </tr>,
                ...objective.activities.map((activity) => {
                  const planRow =
                    planValues.get(activityValuesKey(activity.id, "plans")) ??
                    activity.plans;
                  const actualRow =
                    actualValues.get(
                      activityValuesKey(activity.id, "actuals"),
                    ) ?? activity.actuals;

                  return [
                    /* Plan Row */
                    <tr
                      key={`${activity.id}:plan`}
                      className="border-t border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td
                        rowSpan={2}
                        className="sticky left-0 z-10 w-72 bg-white dark:bg-slate-900 px-3 py-3 align-top border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {activity.name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Target {formatNumber(activity.annualTarget)} |
                          Baseline {formatNumber(activity.baseline)}
                        </div>
                        {activity.responsibleUnits.length > 0 ? (
                          <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                            {activity.responsibleUnits.join(", ")}
                          </div>
                        ) : null}
                      </td>

                      <td
                        rowSpan={2}
                        className="px-3 py-2 align-middle text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                        {activity.unitOfMeasure}
                      </td>

                      <td
                        rowSpan={2}
                        className="px-3 py-2 text-right align-middle text-xs font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                        {formatNumber(activity.weight)}%
                      </td>

                      <td className="px-2 py-1.5 align-middle border-r border-slate-200 dark:border-slate-800 text-center bg-blue-50/30 dark:bg-blue-950/20">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 uppercase">
                          Plan
                        </span>
                      </td>

                      {initialData.months.map((month) => (
                        <td
                          key={month.index}
                          className="px-1.5 py-1.5 border-r border-slate-100 dark:border-slate-800 bg-blue-50/10 dark:bg-blue-950/10">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            aria-label={`${activity.name} plan ${month.longName}`}
                            disabled={!initialData.canEditPlans}
                            value={planRow[month.index] ?? 0}
                            onFocus={(e) => e.target.select()}
                            onChange={(event) =>
                              updateValue(
                                "plans",
                                activity.id,
                                month.index,
                                event.target.value,
                              )
                            }
                            className="h-8 w-20 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-right text-xs font-mono transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:text-slate-400"
                          />
                        </td>
                      ))}

                      <td
                        rowSpan={2}
                        className="px-3 py-2 text-right font-semibold align-middle border-r border-slate-200 dark:border-slate-800">
                        {formatNumber(activity.annualPlan)}
                      </td>

                      <td
                        rowSpan={2}
                        className="px-3 py-2 text-right font-semibold align-middle border-r border-slate-200 dark:border-slate-800">
                        {formatNumber(activity.annualActual)}
                      </td>

                      <td
                        rowSpan={2}
                        className="px-3 py-2 text-right font-semibold align-middle border-r border-slate-200 dark:border-slate-800">
                        {formatPercent(activity.achievementPercent)}
                      </td>

                      <td
                        rowSpan={2}
                        className="px-3 py-2 text-right font-semibold align-middle border-r border-slate-200 dark:border-slate-800">
                        {formatNumber(activity.weightedScore)}
                      </td>

                      <td rowSpan={2} className="px-3 py-2 align-middle">
                        <Badge
                          variant="outline"
                          className={statusClasses(activity.status)}>
                          {activity.status.replace("_", " ")}
                        </Badge>
                      </td>
                    </tr>,

                    /* Actual Row */
                    <tr
                      key={`${activity.id}:actual`}
                      className="border-t border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-2 py-1.5 align-middle border-r border-slate-200 dark:border-slate-800 text-center bg-emerald-50/30 dark:bg-emerald-950/20">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 uppercase">
                          Actual
                        </span>
                      </td>

                      {initialData.months.map((month) => (
                        <td
                          key={month.index}
                          className="px-1.5 py-1.5 border-r border-slate-100 dark:border-slate-800 bg-emerald-50/10 dark:bg-emerald-950/10">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            aria-label={`${activity.name} actual ${month.longName}`}
                            disabled={!initialData.canEditActuals}
                            value={actualRow[month.index] ?? 0}
                            onFocus={(e) => e.target.select()}
                            onChange={(event) =>
                              updateValue(
                                "actuals",
                                activity.id,
                                month.index,
                                event.target.value,
                              )
                            }
                            className="h-8 w-20 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-right text-xs font-mono transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:text-slate-400"
                          />
                        </td>
                      ))}
                    </tr>,
                  ];
                }),
              ]),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
