import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ReportPrintButton } from "@/components/reports/report-print-button";
import { getScorecardActorOrRedirect } from "@/lib/scorecard-actor";
import { getMonthlyWorkspace } from "@/lib/services/monthly-data.service";

export const dynamic = "force-dynamic";

type ReportsPageProps = {
  searchParams: Promise<{
    scorecardId?: string;
  }>;
};

function formatNumber(value: number | null): string {
  if (value === null) {
    return "No plan";
  }

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const actor = await getScorecardActorOrRedirect();
  const params = await searchParams;
  const data = await getMonthlyWorkspace(actor, params.scorecardId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Consolidated reports"
        title="Scorecard performance report"
        description="Department scorecard consolidation using persisted plans, actuals, achievements and weighted scores."
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <form className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-sm font-medium" htmlFor="scorecardId">
              Scorecard
            </label>
            <select
              id="scorecardId"
              name="scorecardId"
              defaultValue={data.selectedScorecard?.id ?? ""}
              className="h-9 min-w-80 rounded-md border border-slate-200 bg-white px-3 text-sm">
              {data.scorecards.map((scorecard) => (
                <option key={scorecard.id} value={scorecard.id}>
                  {scorecard.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-9 rounded-md bg-slate-950 px-3 text-sm font-medium text-white">
              Apply
            </button>
          </form>
          <ReportPrintButton />
        </CardContent>
      </Card>

      {!data.selectedScorecard ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-sm text-slate-500">
            No scorecard is available for reporting.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white print:overflow-visible">
          <table className="min-w-[1100px] w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-3 text-left">Perspective</th>
                <th className="px-3 py-3 text-left">Objective</th>
                <th className="px-3 py-3 text-left">Activity</th>
                <th className="px-3 py-3 text-left">Unit</th>
                <th className="px-3 py-3 text-right">Baseline</th>
                <th className="px-3 py-3 text-right">Plan</th>
                <th className="px-3 py-3 text-right">Actual</th>
                <th className="px-3 py-3 text-right">Achievement</th>
                <th className="px-3 py-3 text-right">Weighted score</th>
                <th className="px-3 py-3 text-left">Responsible units</th>
              </tr>
            </thead>
            <tbody>
              {data.perspectives.flatMap((perspective) =>
                perspective.objectives.flatMap((objective) =>
                  objective.activities.map((activity) => (
                    <tr key={activity.id} className="border-t">
                      <td className="px-3 py-3 align-top">
                        {perspective.name}
                        <div className="text-xs text-slate-500">
                          {formatNumber(perspective.weight)}%
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        {objective.name}
                        <div className="text-xs text-slate-500">
                          {formatNumber(objective.weight)}%
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="font-medium">{activity.name}</div>
                        {activity.remark ? (
                          <div className="mt-1 text-xs text-slate-500">
                            {activity.remark}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <Badge variant="outline">{activity.unitOfMeasure}</Badge>
                      </td>
                      <td className="px-3 py-3 text-right align-top">
                        {formatNumber(activity.baseline)}
                      </td>
                      <td className="px-3 py-3 text-right align-top">
                        {formatNumber(activity.annualPlan)}
                      </td>
                      <td className="px-3 py-3 text-right align-top">
                        {formatNumber(activity.annualActual)}
                      </td>
                      <td className="px-3 py-3 text-right align-top">
                        {activity.achievementPercent === null
                          ? "No plan"
                          : `${formatNumber(activity.achievementPercent)}%`}
                      </td>
                      <td className="px-3 py-3 text-right align-top">
                        {formatNumber(activity.weightedScore)}
                      </td>
                      <td className="px-3 py-3 align-top">
                        {activity.responsibleUnits.join(", ") || "Not assigned"}
                      </td>
                    </tr>
                  )),
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
