import { PageHeader } from "@/components/page-header";
import { MonthlyDataWorkspace } from "@/components/data-entry/monthly-data-workspace";
import { getScorecardActorOrRedirect } from "@/lib/scorecard-actor";
import { getMonthlyWorkspace } from "@/lib/services/monthly-data.service";

export const dynamic = "force-dynamic";

type DataEntryPageProps = {
  searchParams: Promise<{
    scorecardId?: string;
  }>;
};

export default async function DataEntryPage({ searchParams }: DataEntryPageProps) {
  const actor = await getScorecardActorOrRedirect();
  const params = await searchParams;
  const data = await getMonthlyWorkspace(actor, params.scorecardId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plans and actuals"
        title="Monthly performance data"
        description="Maintain monthly plans and actual performance values across the July-to-June fiscal year."
      />
      <MonthlyDataWorkspace initialData={data} />
    </div>
  );
}
