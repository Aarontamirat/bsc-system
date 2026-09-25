"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
} from "lucide-react";

export type ExportMonth = {
  index: number;
  shortName: string;
  longName: string;
};

export type ExportReportRow = {
  perspective: string;
  objective: string;
  activity: string;
  /** Activity/KPI weight as a percentage of the scorecard. */
  weight: number;
  unit: string;
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

export type ExportGroupedPerspective = {
  name: string;
  weight: number;
  objectives: {
    name: string;
    rows: ExportReportRow[];
  }[];
};

type ReportExportButtonsProps = {
  scorecardLabel: string;
  periodLabel: string;
  overallScore: number | null;
  months: ExportMonth[];
  groupedPerspectives: ExportGroupedPerspective[];
};

const PDF_MARGIN = 10;
const PDF_FOOTER_HEIGHT = 10;

export function ReportExportButtons({
  scorecardLabel,
  periodLabel,
  overallScore,
  months,
  groupedPerspectives,
}: ReportExportButtonsProps) {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  const formatNum = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return "N/A";
    }

    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDateTime = (date = new Date()) =>
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);

  const sanitizeFilename = (value: string) =>
    value
      .trim()
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "Scorecard";

  /**
   * RFC 4180-compatible CSV escaping plus protection against CSV formula
   * injection when the exported file is opened in spreadsheet software.
   */
  const escapeCsv = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return '""';

    let stringValue = String(value);

    if (/^[=+\-@]/.test(stringValue)) {
      stringValue = `'${stringValue}`;
    }

    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  const getAllRows = () =>
    groupedPerspectives.flatMap((perspective) =>
      perspective.objectives.flatMap((objective) =>
        objective.rows.map((row) => ({
          perspective,
          objective,
          row,
        })),
      ),
    );

  const getStatusStyle = (status: ExportReportRow["status"]) => {
    switch (status) {
      case "GREEN":
        return {
          fillColor: [220, 252, 231],
          textColor: [22, 101, 52],
        };
      case "YELLOW":
        return {
          fillColor: [254, 249, 195],
          textColor: [133, 77, 14],
        };
      case "RED":
        return {
          fillColor: [254, 226, 226],
          textColor: [153, 27, 27],
        };
      default:
        return {
          fillColor: [241, 245, 249],
          textColor: [71, 85, 105],
        };
    }
  };

  // ---------------------------------------------------------------------------
  // CSV EXPORT
  // ---------------------------------------------------------------------------
  const handleExportCSV = () => {
    try {
      setIsExportingCsv(true);

      const generatedAt = new Date();
      const csvLines: string[] = [];

      // Report metadata.
      csvLines.push(
        ["SCORECARD PERFORMANCE REPORT", "", "", "", "", "", "", ""].join(","),
      );
      csvLines.push(["Scorecard", scorecardLabel].map(escapeCsv).join(","));
      csvLines.push(["Period", periodLabel].map(escapeCsv).join(","));
      csvLines.push(
        ["Overall Score", formatNum(overallScore)].map(escapeCsv).join(","),
      );
      csvLines.push(
        ["Generated On", formatDateTime(generatedAt)].map(escapeCsv).join(","),
      );
      csvLines.push("");

      const headers = [
        "Perspective",
        "Perspective Weight %",
        "Objective",
        "Activity Name",
        "Activity Weight %",
        "Unit of Measure",
        "Baseline",
      ];

      months.forEach((month) => {
        headers.push(`${month.longName} Plan`, `${month.longName} Actual`);
      });

      headers.push(
        "Total Plan",
        "Total Actual",
        "Achievement %",
        "Weighted Score",
        "Status",
        "Responsible Units",
      );

      csvLines.push(headers.map(escapeCsv).join(","));

      getAllRows().forEach(({ perspective, objective, row }) => {
        const rowData: (string | number | null)[] = [
          perspective.name,
          perspective.weight,
          objective.name,
          row.activity,
          row.weight,
          row.unit,
          row.baseline,
        ];

        months.forEach((month) => {
          rowData.push(
            row.plans[month.index] ?? 0,
            row.actuals[month.index] ?? 0,
          );
        });

        rowData.push(
          row.plan,
          row.actual,
          row.achievement !== null ? row.achievement : null,
          row.score,
          row.status,
          row.responsibleUnits.join("; "),
        );

        csvLines.push(rowData.map(escapeCsv).join(","));
      });

      // CRLF is intentional: it is the most interoperable line ending for
      // spreadsheet applications on Windows and enterprise environments.
      const csv = "\uFEFF" + csvLines.join("\r\n") + "\r\n";
      const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = `Scorecard_Report_${sanitizeFilename(
        scorecardLabel,
      )}_${new Date().toISOString().slice(0, 10)}.csv`;

      link.href = url;
      link.download = filename;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("CSV export failed:", error);
    } finally {
      setIsExportingCsv(false);
    }
  };

  // ---------------------------------------------------------------------------
  // PDF EXPORT
  // ---------------------------------------------------------------------------
  const handleExportPDF = async () => {
    setIsExportingPdf(true);

    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const monthCount = months.length;

      // A4 is comfortable for short monthly ranges. A3 is deliberately used
      // for larger ranges so monthly columns remain readable instead of being
      // squeezed into an unusable A4 table.
      const pdfFormat = monthCount > 6 ? "a3" : "a4";

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: pdfFormat,
        compress: true,
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const contentWidth = pageWidth - PDF_MARGIN * 2;

      const generatedAt = new Date();

      // -----------------------------------------------------------------------
      // PDF palette
      // -----------------------------------------------------------------------
      const navy: [number, number, number] = [15, 23, 42];
      const slate800: [number, number, number] = [30, 41, 59];
      const slate700: [number, number, number] = [51, 65, 85];
      // const slate600: [number, number, number] = [71, 85, 105];
      const slate500: [number, number, number] = [100, 116, 139];
      const slate200: [number, number, number] = [226, 232, 240];
      const slate100: [number, number, number] = [241, 245, 249];
      const slate50: [number, number, number] = [248, 250, 252];
      const white: [number, number, number] = [255, 255, 255];

      // -----------------------------------------------------------------------
      // Header/footer helpers
      // -----------------------------------------------------------------------
      const drawPageChrome = (pageNumber: number, totalPages: number) => {
        // Thin top accent line.
        doc.setFillColor(...navy);
        doc.rect(0, 0, pageWidth, 2.5, "F");

        // Footer separator.
        doc.setDrawColor(...slate200);
        doc.setLineWidth(0.25);
        doc.line(
          PDF_MARGIN,
          pageHeight - PDF_FOOTER_HEIGHT,
          pageWidth - PDF_MARGIN,
          pageHeight - PDF_FOOTER_HEIGHT,
        );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...slate500);

        doc.text(
          "Confidential • Internal Corporate Performance Report",
          PDF_MARGIN,
          pageHeight - 4.5,
        );

        doc.text(
          `Page ${pageNumber} of ${totalPages}`,
          pageWidth - PDF_MARGIN,
          pageHeight - 4.5,
          { align: "right" },
        );
      };

      const drawHeader = () => {
        // Corporate title.
        doc.setTextColor(...navy);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text("SCORECARD PERFORMANCE REPORT", PDF_MARGIN, 13);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...slate500);
        doc.text(
          `Generated ${formatDateTime(generatedAt)}`,
          pageWidth - PDF_MARGIN,
          12.5,
          { align: "right" },
        );

        // Metadata card.
        const cardY = 18;
        const cardH = 19;

        doc.setFillColor(...slate50);
        doc.setDrawColor(...slate200);
        doc.roundedRect(PDF_MARGIN, cardY, contentWidth, cardH, 2, 2, "FD");

        const cardColumns = [
          { label: "Scorecard", value: scorecardLabel },
          { label: "Reporting Period", value: periodLabel },
          {
            label: "Overall Score",
            value: formatNum(overallScore),
          },
          {
            label: "Detail",
            value: `${getAllRows().length} activities • ${monthCount} months`,
          },
        ];

        const cardColumnWidth = contentWidth / cardColumns.length;

        cardColumns.forEach((item, index) => {
          const x = PDF_MARGIN + index * cardColumnWidth + 5;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.setTextColor(...slate500);
          doc.text(item.label.toUpperCase(), x, cardY + 6.5);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(index === 0 ? 8 : 8.5);
          doc.setTextColor(...navy);

          const maxTextWidth = cardColumnWidth - 10;
          const lines = doc.splitTextToSize(item.value || "—", maxTextWidth);
          doc.text(lines.slice(0, 2), x, cardY + 12.5);
        });
      };

      // -----------------------------------------------------------------------
      // Main table
      // -----------------------------------------------------------------------
      // Activity Weight is deliberately shown immediately beside the activity
      // so the exported score can always be interpreted against its assigned
      // weight.
      const totalColumns = 9 + monthCount * 2;

      const tableHead = [
        [
          "Objective / Activity",
          "Weight %",
          "Unit",
          "Baseline",
          ...months.flatMap((month) => [
            `${month.shortName}\nPlan`,
            `${month.shortName}\nActual`,
          ]),
          "Total\nPlan",
          "Total\nActual",
          "Achievement",
          "Score",
          "Status",
        ],
      ];

      const tableBody: any[] = [];

      groupedPerspectives.forEach((perspective) => {
        tableBody.push([
          {
            content: `PERSPECTIVE  •  ${perspective.name.toUpperCase()}  •  WEIGHT ${formatNum(
              perspective.weight,
            )}%`,
            colSpan: totalColumns,
            styles: {
              fillColor: slate800,
              textColor: white,
              fontStyle: "bold",
              fontSize: monthCount > 6 ? 7 : 7.5,
              cellPadding: { top: 2, right: 3, bottom: 2, left: 3 },
              halign: "left",
              valign: "middle",
            },
          },
        ]);

        perspective.objectives.forEach((objective) => {
          tableBody.push([
            {
              content: `OBJECTIVE  •  ${objective.name}`,
              colSpan: totalColumns,
              styles: {
                fillColor: slate100,
                textColor: slate700,
                fontStyle: "bold",
                fontSize: monthCount > 6 ? 6.5 : 7,
                cellPadding: { top: 1.8, right: 3, bottom: 1.8, left: 3 },
                halign: "left",
                valign: "middle",
              },
            },
          ]);

          objective.rows.forEach((row) => {
            const monthlyValues = months.flatMap((month) => [
              formatNum(row.plans[month.index] ?? 0),
              formatNum(row.actuals[month.index] ?? 0),
            ]);

            tableBody.push([
              row.activity,
              `${formatNum(row.weight)}%`,
              row.unit || "—",
              formatNum(row.baseline),
              ...monthlyValues,
              formatNum(row.plan),
              formatNum(row.actual),
              row.achievement !== null ? `${formatNum(row.achievement)}%` : "—",
              formatNum(row.score),
              row.status.replace("_", " "),
            ]);
          });
        });
      });

      // Carefully sized columns. For 12 months this keeps the complete table
      // inside A3 landscape rather than allowing autoTable to clip the right
      // side or force unpredictable widths.
      const activityWidth = monthCount > 6 ? 52 : 43;
      const weightWidth = monthCount > 6 ? 15 : 16;
      const unitWidth = monthCount > 6 ? 15 : 16;
      const baselineWidth = monthCount > 6 ? 16 : 17;
      const monthWidth = monthCount > 6 ? 10.5 : 13;
      const totalWidth = monthCount > 6 ? 16 : 18;
      const achievementWidth = monthCount > 6 ? 18 : 19;
      const scoreWidth = monthCount > 6 ? 16 : 18;
      const statusWidth = monthCount > 6 ? 20 : 22;

      const fixedWidth =
        activityWidth +
        weightWidth +
        unitWidth +
        baselineWidth +
        monthCount * 2 * monthWidth +
        totalWidth * 2 +
        achievementWidth +
        scoreWidth +
        statusWidth;

      // Keep the table inside the page even if a future month count changes.
      const widthScale =
        fixedWidth > contentWidth ? contentWidth / fixedWidth : 1;

      const scaled = (width: number) => Number((width * widthScale).toFixed(2));

      autoTable(doc, {
        startY: 42,
        margin: {
          top: 42,
          right: PDF_MARGIN,
          bottom: PDF_FOOTER_HEIGHT + 2,
          left: PDF_MARGIN,
        },
        head: tableHead,
        body: tableBody,
        theme: "grid",
        tableWidth: "wrap",
        styles: {
          font: "helvetica",
          fontSize: monthCount > 6 ? 6.2 : 6.8,
          cellPadding:
            monthCount > 6
              ? { top: 1.25, right: 1.25, bottom: 1.25, left: 1.25 }
              : { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 },
          lineColor: slate200,
          lineWidth: 0.25,
          textColor: slate700,
          valign: "middle",
          overflow: "linebreak",
          cellWidth: "wrap",
        },
        headStyles: {
          fillColor: navy,
          textColor: white,
          fontStyle: "bold",
          fontSize: monthCount > 6 ? 6.2 : 6.8,
          halign: "center",
          valign: "middle",
          cellPadding:
            monthCount > 6
              ? { top: 2, right: 1, bottom: 2, left: 1 }
              : { top: 2, right: 1.5, bottom: 2, left: 1.5 },
        },
        alternateRowStyles: {
          fillColor: [252, 253, 255],
        },
        columnStyles: {
          0: {
            cellWidth: scaled(activityWidth),
            halign: "left",
            fontStyle: "normal",
          },
          1: {
            cellWidth: scaled(weightWidth),
            halign: "right",
            fontStyle: "bold",
          },
          2: {
            cellWidth: scaled(unitWidth),
            halign: "center",
          },
          3: {
            cellWidth: scaled(baselineWidth),
            halign: "right",
          },
          ...Object.fromEntries(
            Array.from({ length: monthCount * 2 }, (_, i) => [
              i + 4,
              {
                cellWidth: scaled(monthWidth),
                halign: "right",
              },
            ]),
          ),
          [4 + monthCount * 2]: {
            cellWidth: scaled(totalWidth),
            halign: "right",
            fontStyle: "bold",
          },
          [5 + monthCount * 2]: {
            cellWidth: scaled(totalWidth),
            halign: "right",
            fontStyle: "bold",
          },
          [6 + monthCount * 2]: {
            cellWidth: scaled(achievementWidth),
            halign: "right",
            fontStyle: "bold",
          },
          [7 + monthCount * 2]: {
            cellWidth: scaled(scoreWidth),
            halign: "right",
          },
          [8 + monthCount * 2]: {
            cellWidth: scaled(statusWidth),
            halign: "center",
            fontStyle: "bold",
          },
        },
        didParseCell: (data: any) => {
          // Style actual data status cells without relying on fixed RGB
          // values in the row data itself.
          if (
            data.section === "body" &&
            data.column.index === 8 + monthCount * 2 &&
            typeof data.cell.raw === "string"
          ) {
            const status = data.cell.raw.replace(" ", "_") as
              | ExportReportRow["status"]
              | string;

            const statusStyle =
              status === "GREEN" ||
              status === "YELLOW" ||
              status === "RED" ||
              status === "NO_PLAN"
                ? getStatusStyle(status)
                : null;

            if (statusStyle) {
              data.cell.styles.fillColor = statusStyle.fillColor;
              data.cell.styles.textColor = statusStyle.textColor;
            }
          }

          // Keep numeric columns consistently aligned.
          if (
            data.section === "body" &&
            data.row.index >= 0 &&
            data.column.index >= 2 &&
            data.column.index !== 8 + monthCount * 2
          ) {
            data.cell.styles.halign = "right";
          }
        },
        didDrawPage: (data: any) => {
          drawHeader();
          drawPageChrome(
            data.pageNumber,
            (doc as any).internal.getNumberOfPages(),
          );
        },
      });

      // A second pass makes the "Page X of Y" footer correct on every page
      // after autoTable has finished generating all pages.
      const totalPages = (doc as any).internal.getNumberOfPages();

      for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        drawPageChrome(page, totalPages);
      }

      const filename = `Scorecard_Report_${sanitizeFilename(
        scorecardLabel,
      )}_${new Date().toISOString().slice(0, 10)}.pdf`;

      doc.save(filename);
    } catch (error) {
      console.error("PDF export failed:", error);

      // Preserve the existing print fallback if PDF dependencies are
      // unavailable at runtime.
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              disabled={isExportingPdf || isExportingCsv}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
              {isExportingPdf || isExportingCsv ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              ) : (
                <Download className="h-4 w-4 text-slate-500" />
              )}
              <span>
                {isExportingPdf
                  ? "Preparing PDF…"
                  : isExportingCsv
                    ? "Preparing CSV…"
                    : "Export Data"}
              </span>
            </Button>
          }
        />

        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            onClick={handleExportCSV}
            disabled={isExportingCsv || isExportingPdf}
            className="cursor-pointer">
            <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
            <span>Export as CSV</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleExportPDF}
            disabled={isExportingPdf || isExportingCsv}
            className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4 text-rose-600" />
            <span>Export as PDF</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => window.print()}
            disabled={isExportingPdf || isExportingCsv}
            className="cursor-pointer border-t border-slate-100 dark:border-slate-800">
            <Printer className="mr-2 h-4 w-4 text-slate-500" />
            <span>Print View</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
