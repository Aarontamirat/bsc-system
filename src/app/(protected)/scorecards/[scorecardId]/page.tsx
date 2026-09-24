import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma";

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
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { scorecardId } = await params;

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      role: true,
      departmentId: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const structure = await getScorecardStructure(
    {
      userId: session.user.id,
      role: user.role,
      departmentId: user.departmentId,
    },
    scorecardId,
  ).catch((error: unknown) => {
    if (error instanceof ScorecardServiceError && error.code === "NOT_FOUND") {
      notFound();
    }

    if (error instanceof ScorecardServiceError && error.code === "FORBIDDEN") {
      redirect("/scorecards");
    }

    throw error;
  });

  if (!structure) {
    notFound();
  }

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
        })),
      })),
    })),
  };

  return (
    <ScorecardEditor data={editorData} canEdit={user.role === UserRole.ADMIN} />
  );
}
