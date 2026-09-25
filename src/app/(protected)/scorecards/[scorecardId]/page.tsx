import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { getScorecardActorOrRedirect } from "@/lib/scorecard-actor";
import { getScorecardStructure } from "@/lib/services/scorecard-structure.service";
import { ScorecardServiceError } from "@/lib/services/scorecard.service";

import { ScorecardEditor } from "@/components/scorecards/scorecard-editor";

interface ScorecardPageProps {
  params: Promise<{
    scorecardId: string;
  }>;
}

function decimalToNumber(value: unknown): number {
  return Number(value);
}

export default async function ScorecardPage({ params }: ScorecardPageProps) {
  const { scorecardId } = await params;
  const actor = await getScorecardActorOrRedirect();

  const structure = await getScorecardStructure(actor, scorecardId).catch(
    (error: unknown) => {
      if (
        error instanceof ScorecardServiceError &&
        error.code === "NOT_FOUND"
      ) {
        notFound();
      }

      if (
        error instanceof ScorecardServiceError &&
        error.code === "FORBIDDEN"
      ) {
        redirect("/scorecards");
      }

      throw error;
    },
  );

  if (!structure) {
    notFound();
  }

  const departments = await prisma.department.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const editorData = {
    id: structure.id,
    departmentId: structure.departmentId,
    year: structure.year,
    departmentName: structure.department.name,

    perspectives: structure.perspectives.map((perspective) => ({
      id: perspective.id,
      scorecardId: perspective.scorecardId,
      name: perspective.name,
      weight: decimalToNumber(perspective.weight),

      objectives: perspective.objectives.map((objective) => ({
        id: objective.id,
        perspectiveId: objective.perspectiveId,
        name: objective.name,
        weight: decimalToNumber(objective.weight),

        activities: objective.activities.map((activity) => ({
          id: activity.id,
          objectiveId: activity.objectiveId,
          name: activity.name,
          weight: decimalToNumber(activity.weight),
          unitOfMeasure: activity.unitOfMeasure,
          annualTarget: decimalToNumber(activity.annualTarget),
          baseline: decimalToNumber(activity.baseline),
          remark: activity.remark,
          sortOrder: activity.sortOrder,
          responsibleDepartmentIds: activity.responsibleUnits.map(
            (unit) => unit.departmentId,
          ),
          responsibleUnits: activity.responsibleUnits.map((unit) => ({
            id: unit.department.id,
            name: unit.department.name,
          })),
        })),
      })),
    })),
  };

  return (
    <ScorecardEditor
      data={editorData}
      departments={departments}
      canEdit={actor.role === "ADMIN"}
    />
  );
}
