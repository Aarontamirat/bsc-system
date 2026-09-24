import { redirect } from "next/navigation";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma";
import {
  getScorecards,
  type ScorecardActor,
} from "@/lib/services/scorecard.service";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScorecardCreateDialog } from "@/components/scorecards/scorecard-create-dialog";

function formatFiscalYear(year: number): string {
  return `FY${year}/${year + 1}`;
}

function getActor(user: {
  id: string;
  role: UserRole;
  departmentId: string;
}): ScorecardActor {
  return {
    userId: user.id,
    role: user.role,
    departmentId: user.departmentId,
  };
}

export default async function ScorecardsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      role: true,
      departmentId: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const actor = getActor(user);

  const [scorecards, departments] = await Promise.all([
    getScorecards(actor),

    actor.role === UserRole.ADMIN
      ? prisma.department.findMany({
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            name: "asc",
          },
        })
      : Promise.resolve([]),
  ]);

  const totalPerspectives = scorecards.reduce(
    (total, scorecard) => total + scorecard.perspectives.length,
    0,
  );

  const totalObjectives = scorecards.reduce(
    (total, scorecard) =>
      total +
      scorecard.perspectives.reduce(
        (perspectiveTotal, perspective) =>
          perspectiveTotal + perspective.objectives.length,
        0,
      ),
    0,
  );

  const totalActivities = scorecards.reduce(
    (total, scorecard) =>
      total +
      scorecard.perspectives.reduce(
        (perspectiveTotal, perspective) =>
          perspectiveTotal +
          perspective.objectives.reduce(
            (objectiveTotal, objective) =>
              objectiveTotal + objective.activities.length,
            0,
          ),
        0,
      ),
    0,
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-blue-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge
              variant="secondary"
              className="mb-3 rounded-full px-3 py-1 text-xs">
              BSC MANAGEMENT
            </Badge>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Scorecards
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Create, review and manage annual departmental Balanced Scorecards.
              Each scorecard contains perspectives, objectives and measurable
              activities.
            </p>
          </div>

          {actor.role === UserRole.ADMIN && (
            <ScorecardCreateDialog departments={departments} />
          )}
        </div>
      </section>

      {/* Summary */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Scorecards
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight">
              {scorecards.length}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Annual departmental scorecards
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Perspectives
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight">
              {totalPerspectives}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Strategic performance dimensions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Objectives
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight">
              {totalObjectives}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Strategic objectives
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Activities
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight">
              {totalActivities}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Measurable activities
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Scorecard listing */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Department Scorecards
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Select a scorecard to manage its structure and performance
            indicators.
          </p>
        </div>

        {scorecards.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex min-h-60 flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-2xl">
                📊
              </div>

              <h3 className="text-lg font-semibold">No scorecards yet</h3>

              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {actor.role === UserRole.ADMIN
                  ? "Create the first departmental scorecard to begin defining perspectives, objectives and activities."
                  : "Your department does not have a scorecard yet."}
              </p>

              {actor.role === UserRole.ADMIN && (
                <div className="mt-5">
                  <ScorecardCreateDialog departments={departments} />
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {scorecards.map((scorecard) => {
              const perspectiveCount = scorecard.perspectives.length;

              const objectiveCount = scorecard.perspectives.reduce(
                (total, perspective) => total + perspective.objectives.length,
                0,
              );

              const activityCount = scorecard.perspectives.reduce(
                (total, perspective) =>
                  total +
                  perspective.objectives.reduce(
                    (objectiveTotal, objective) =>
                      objectiveTotal + objective.activities.length,
                    0,
                  ),
                0,
              );

              const perspectiveWeight = scorecard.perspectives.reduce(
                (total, perspective) => total + Number(perspective.weight),
                0,
              );

              const structureComplete =
                perspectiveCount > 0 &&
                Math.abs(perspectiveWeight - 100) <= 0.01;

              return (
                <a
                  key={scorecard.id}
                  href={`/scorecards/${scorecard.id}`}
                  className="group block">
                  <Card className="h-full overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
                    <CardContent className="p-0">
                      <div className="border-b bg-muted/30 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Department
                            </p>

                            <h3 className="mt-1 truncate text-xl font-semibold tracking-tight">
                              {scorecard.department.name}
                            </h3>
                          </div>

                          <Badge
                            variant={
                              structureComplete ? "default" : "secondary"
                            }
                            className="shrink-0">
                            {structureComplete ? "Ready" : "In Progress"}
                          </Badge>
                        </div>

                        <p className="mt-3 text-sm font-medium text-muted-foreground">
                          {formatFiscalYear(scorecard.year)}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 divide-x">
                        <div className="p-4">
                          <p className="text-xs text-muted-foreground">
                            Perspectives
                          </p>

                          <p className="mt-1 text-lg font-semibold">
                            {perspectiveCount}
                          </p>
                        </div>

                        <div className="p-4">
                          <p className="text-xs text-muted-foreground">
                            Objectives
                          </p>

                          <p className="mt-1 text-lg font-semibold">
                            {objectiveCount}
                          </p>
                        </div>

                        <div className="p-4">
                          <p className="text-xs text-muted-foreground">
                            Activities
                          </p>

                          <p className="mt-1 text-lg font-semibold">
                            {activityCount}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t px-5 py-4">
                        <div className="text-xs text-muted-foreground">
                          Perspective weight
                        </div>

                        <div className="text-sm font-semibold">
                          {perspectiveWeight.toFixed(1)}%
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
