"use client";

import React from "react";
import {
  ReportExportButtons,
  type ExportGroupedPerspective,
  type ExportMonth,
} from "./report-export-buttons";

type ReportPrintButtonProps = {
  scorecardLabel?: string;
  periodLabel?: string;
  overallScore?: number | null;
  months?: ExportMonth[];
  groupedPerspectives?: ExportGroupedPerspective[];
};

export function ReportPrintButton({
  scorecardLabel = "Scorecard Report",
  periodLabel = "Select Period",
  overallScore = null,
  months = [],
  groupedPerspectives = [],
}: ReportPrintButtonProps) {
  return (
    <ReportExportButtons
      scorecardLabel={scorecardLabel}
      periodLabel={periodLabel}
      overallScore={overallScore}
      months={months}
      groupedPerspectives={groupedPerspectives}
    />
  );
}
