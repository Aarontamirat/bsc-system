"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CircleAlert,
  Download,
  Loader2,
  RefreshCcw,
  Save,
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
  if (status === "GREEN") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "YELLOW") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "NO_PLAN") {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }

  return "border-red-200 bg-red-50 text-red-700";
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

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Monthly data workspace
            </p>
            <h2 className="mt-1 truncate text-2xl font-semibold">
              {initialData.selectedScorecard?.label ?? "Select scorecard"}
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select
              value={initialData.selectedScorecard?.id ?? ""}
              onValueChange={changeScorecard}>
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder="Select scorecard" />
              </SelectTrigger>
              <SelectContent>
                {initialData.scorecards.map((scorecard) => (
                  <SelectItem key={scorecard.id} value={scorecard.id}>
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
                onClick={initializePlans}>
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Initialize plans
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Activities</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {activities.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">
              Plan editing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">
              {initialData.canEditPlans ? "Admin enabled" : "View only"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">
              Actual editing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">
              {initialData.canEditActuals ? "Enabled" : "View only"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {initialData.canEditPlans ? (
          <Button
            type="button"
            disabled={pending}
            onClick={() => saveValues("plans")}>
            <Save className="h-4 w-4" />
            Save plans
          </Button>
        ) : null}
        <Button
          type="button"
          disabled={pending || !initialData.canEditActuals}
          onClick={() => saveValues("actuals")}>
          <CheckCircle2 className="h-4 w-4" />
          Save actuals
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-350 w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="sticky left-0 z-10 w-72 bg-slate-50 px-3 py-3 text-left">
                Activity
              </th>
              <th className="px-3 py-3 text-left">Unit</th>
              <th className="px-3 py-3 text-right">Weight</th>
              {initialData.months.map((month) => (
                <th key={month.index} className="px-2 py-3 text-right">
                  {month.shortName}
                </th>
              ))}
              <th className="px-3 py-3 text-right">Annual plan</th>
              <th className="px-3 py-3 text-right">Annual actual</th>
              <th className="px-3 py-3 text-right">Achievement</th>
              <th className="px-3 py-3 text-right">Score</th>
              <th className="px-3 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {initialData.perspectives.map((perspective) => (
              <tr key={perspective.id} className="border-t bg-slate-100/70">
                <td colSpan={21} className="px-3 py-2 font-semibold">
                  {perspective.name} ({formatNumber(perspective.weight)}%)
                </td>
              </tr>
            ))}
            {initialData.perspectives.flatMap((perspective) =>
              perspective.objectives.flatMap((objective) => [
                <tr key={objective.id} className="border-t bg-slate-50">
                  <td
                    colSpan={21}
                    className="px-3 py-2 font-medium text-slate-700">
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
                    <tr key={`${activity.id}:plan`} className="border-t">
                      <td
                        rowSpan={2}
                        className="sticky left-0 z-10 w-72 bg-white px-3 py-3 align-top">
                        <div className="font-medium text-slate-900">
                          {activity.name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Target {formatNumber(activity.annualTarget)} |
                          Baseline {formatNumber(activity.baseline)}
                        </div>
                        {activity.responsibleUnits.length > 0 ? (
                          <div className="mt-1 text-xs text-slate-500">
                            {activity.responsibleUnits.join(", ")}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {activity.unitOfMeasure}
                      </td>
                      <td className="px-3 py-2 text-right align-middle">
                        {formatNumber(activity.weight)}%
                      </td>
                      {initialData.months.map((month) => (
                        <td key={month.index} className="px-1.5 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            aria-label={`${activity.name} plan ${month.longName}`}
                            disabled={!initialData.canEditPlans}
                            value={planRow[month.index] ?? 0}
                            onChange={(event) =>
                              updateValue(
                                "plans",
                                activity.id,
                                month.index,
                                event.target.value,
                              )
                            }
                            className="h-8 w-20 rounded-md border border-slate-200 px-2 text-right text-xs disabled:bg-slate-50"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-medium">
                        {formatNumber(activity.annualPlan)}
                      </td>
                      <td className="px-3 py-2 text-right" rowSpan={2}>
                        {formatNumber(activity.annualActual)}
                      </td>
                      <td className="px-3 py-2 text-right" rowSpan={2}>
                        {formatPercent(activity.achievementPercent)}
                      </td>
                      <td className="px-3 py-2 text-right" rowSpan={2}>
                        {formatNumber(activity.weightedScore)}
                      </td>
                      <td className="px-3 py-2" rowSpan={2}>
                        <Badge
                          variant="outline"
                          className={statusClasses(activity.status)}>
                          {activity.status.replace("_", " ")}
                        </Badge>
                      </td>
                    </tr>,
                    <tr
                      key={`${activity.id}:actual`}
                      className="border-t bg-slate-50/50">
                      <td className="px-3 py-2 text-xs font-semibold uppercase text-slate-500">
                        Actual
                      </td>
                      <td />
                      {initialData.months.map((month) => (
                        <td key={month.index} className="px-1.5 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            aria-label={`${activity.name} actual ${month.longName}`}
                            disabled={!initialData.canEditActuals}
                            value={actualRow[month.index] ?? 0}
                            onChange={(event) =>
                              updateValue(
                                "actuals",
                                activity.id,
                                month.index,
                                event.target.value,
                              )
                            }
                            className="h-8 w-20 rounded-md border border-slate-200 px-2 text-right text-xs disabled:bg-slate-50"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        <Download className="ml-auto h-4 w-4 text-slate-300" />
                      </td>
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
