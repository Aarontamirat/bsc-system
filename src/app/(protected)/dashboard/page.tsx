import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import {
  calculateScorecard,
  getCurrentFiscalYear,
} from "@/lib/bsc-calculations";
import { getScorecardActorOrRedirect } from "@/lib/scorecard-actor";
import { getMonthlyWorkspace } from "@/lib/services/monthly-data.service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatNumber(value: number | null): string {
  if (value === null) {
    return "Not ready";
  }

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
  }).format(value);
}

function scoreBadge(score: number | null) {
  if (score === null) {
    return {
      label: "Incomplete",
      className: "border-slate-200 bg-slate-50 text-slate-600",
    };
  }

  if (score >= 100) {
    return {
      label: "On track",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (score >= 80) {
    return {
      label: "Watch",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Behind",
    className: "border-red-200 bg-red-50 text-red-700",
  };
}

export default async function DashboardPage() {
  const actor = await getScorecardActorOrRedirect();
  const fiscalYear = getCurrentFiscalYear();

  const scorecard = await prisma.scorecard.findFirst({
    where: {
      year: fiscalYear,
      ...(actor.role === "ADMIN" ? {} : { departmentId: actor.departmentId }),
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
    },
  });

  const workspace = await getMonthlyWorkspace(actor, scorecard?.id);
  const selected = workspace.selectedScorecard;
  const activities = workspace.perspectives.flatMap((perspective) =>
    perspective.objectives.flatMap((objective) => objective.activities),
  );

  let overallScore: number | null = null;

  try {
    const result = calculateScorecard({
      perspectives: workspace.perspectives.map((perspective) => ({
        name: perspective.name,
        weight: perspective.weight,
        objectives: perspective.objectives.map((objective) => ({
          name: objective.name,
          weight: objective.weight,
          activities: objective.activities.map((activity) => ({
            unitOfMeasure: activity.unitOfMeasure,
            weight: activity.weight,
            plan: activity.annualPlan,
            actual: activity.annualActual,
          })),
        })),
      })),
    });

    overallScore = Number(result.score);
  } catch {
    overallScore = null;
  }

  const badge = scoreBadge(overallScore);
  const plannedActivities = activities.filter(
    (activity) => activity.annualPlan > 0,
  ).length;
  const actualActivities = activities.filter(
    (activity) => activity.annualActual > 0,
  ).length;

  return (
    <div>
      <PageHeader
        eyebrow={`Fiscal Year ${fiscalYear}/${fiscalYear + 1}`}
        title="Performance command centre"
        description="Live scorecard performance based on persisted monthly plans and actuals."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Overall score</CardDescription>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <BarChart3 className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl">
              {formatNumber(overallScore)}
            </CardTitle>
            <Badge variant="outline" className={`mt-3 ${badge.className}`}>
              {badge.label}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Department</CardDescription>
              <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="truncate text-xl">
              {selected?.departmentName ?? "No scorecard"}
            </CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              {selected
                ? `FY${selected.year}/${selected.year + 1}`
                : "Create a scorecard to begin"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Activities</CardDescription>
              <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
                <Activity className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl">{activities.length}</CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              {plannedActivities} with monthly plans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Actual coverage</CardDescription>
              <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                <CalendarDays className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl">{actualActivities}</CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Activities with actual values
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Perspective performance</CardTitle>
            <CardDescription>
              Calculated from consolidated annual plan and actual values.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {workspace.perspectives.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-slate-500">
                No scorecard structure is available for the selected context.
              </div>
            ) : (
              workspace.perspectives.map((perspective) => {
                const perspectiveActivities = perspective.objectives.flatMap(
                  (objective) => objective.activities,
                );
                const averageAchievement =
                  perspectiveActivities.length === 0
                    ? null
                    : perspectiveActivities.reduce(
                        (total, activity) =>
                          total + (activity.achievementPercent ?? 0),
                        0,
                      ) / perspectiveActivities.length;

                return (
                  <div key={perspective.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold">{perspective.name}</p>
                        <p className="text-xs text-slate-500">
                          {perspectiveActivities.length} activities
                        </p>
                      </div>
                      <Badge variant="outline">
                        {formatNumber(averageAchievement)}
                        {averageAchievement === null ? "" : "%"}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access context</CardTitle>
            <CardDescription>Authenticated server-side identity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-2.5">
                <ShieldCheck className="h-4 w-4 text-slate-700" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {actor.role === "ADMIN"
                    ? "System Administrator"
                    : "Department User"}
                </p>
                <p className="text-xs text-slate-500">
                  Server actions re-check this role for every mutation.
                </p>
              </div>
            </div>

            <Link
              href="/data-entry"
              className="inline-flex items-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-700">
              Open plans and actuals
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
