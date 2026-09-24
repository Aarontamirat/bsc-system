import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  ShieldCheck,
  UsersRound,
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

import { getCurrentFiscalYear } from "@/lib/bsc-calculations";

import { requireUser } from "@/lib/auth-guards";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

  const fiscalYear = getCurrentFiscalYear();

  const [department, scorecardCount, userCount, activityCount] =
    await Promise.all([
      prisma.department.findUnique({
        where: {
          id: user.departmentId,
        },
        select: {
          id: true,
          name: true,
          description: true,
        },
      }),

      prisma.scorecard.count({
        where: {
          departmentId: user.departmentId,
        },
      }),

      user.role === "ADMIN"
        ? prisma.user.count({
            where: {
              isActive: true,
            },
          })
        : Promise.resolve(null),

      prisma.activity.count({
        where: {
          objective: {
            perspective: {
              scorecard: {
                departmentId: user.departmentId,
              },
            },
          },
        },
      }),
    ]);

  return (
    <div>
      <PageHeader
        eyebrow={`Fiscal Year ${fiscalYear}`}
        title="Performance command centre"
        description="A controlled view of the current department scorecard environment."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Department</CardDescription>

              <div className="rounded-xl bg-sky-50 p-2.5 text-sky-600">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <CardTitle className="truncate text-xl">
              {department?.name ?? "Unknown"}
            </CardTitle>

            <p className="mt-1 text-xs text-slate-500">
              Assigned organisational unit
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Scorecards</CardDescription>

              <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
                <BarChart3 className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <CardTitle className="text-3xl">{scorecardCount}</CardTitle>

            <p className="mt-1 text-xs text-slate-500">Department scorecards</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Activities</CardDescription>

              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                <Activity className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <CardTitle className="text-3xl">{activityCount}</CardTitle>

            <p className="mt-1 text-xs text-slate-500">
              Activities in your department
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Current FY</CardDescription>

              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                <CalendarDays className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <CardTitle className="text-3xl">{fiscalYear}</CardTitle>

            <p className="mt-1 text-xs text-slate-500">
              July {fiscalYear} — June {fiscalYear + 1}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Application workspace</CardTitle>

            <CardDescription>
              Core BSC modules are being connected to this shell in the next
              implementation phase.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">
                    Scorecard architecture is ready
                  </p>

                  <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                    The authentication, database, fiscal calendar, calculation
                    engine, authorization layer and responsive application shell
                    are now connected.
                  </p>
                </div>

                <Badge className="w-fit rounded-full px-3 py-1">
                  Foundation Ready
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Access context</CardTitle>

            <CardDescription>
              Current authenticated security context
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-100 p-2.5">
                <ShieldCheck className="h-4 w-4 text-slate-700" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {user.username}
                </p>

                <p className="text-xs text-slate-500">
                  {user.role === "ADMIN"
                    ? "System Administrator"
                    : "Department User"}
                </p>
              </div>
            </div>

            {user.role === "ADMIN" ? (
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-2.5">
                  <UsersRound className="h-4 w-4 text-slate-700" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {userCount ?? 0}
                  </p>

                  <p className="text-xs text-slate-500">Active system users</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="font-semibold text-slate-900">Fiscal calendar</p>

            <p className="mt-1 text-sm text-slate-500">
              July is month 0 and June is month 11 throughout the BSC
              calculation engine.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-sky-600 transition hover:text-sky-700">
            Current dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
