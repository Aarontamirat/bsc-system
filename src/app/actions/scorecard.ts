"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

import {
  createScorecard,
  deleteScorecard,
  getScorecardById,
  getScorecards,
  updateScorecard,
  validateScorecardWeights,
  ScorecardServiceError,
} from "@/lib/services/scorecard.service";

type ActionResult<T> =
  | {
      success: true;
      data: T;
      message?: string;
    }
  | {
      success: false;
      message: string;
    };

async function getActor() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new ScorecardServiceError("You must be signed in.", "UNAUTHORIZED");
  }

  /*
   * Read the authoritative role/department from the database
   * rather than trusting client-provided session data.
   */
  const { prisma } = await import("@/lib/prisma");

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
    throw new ScorecardServiceError("User account not found.", "UNAUTHORIZED");
  }

  return {
    userId: user.id,
    role: String(user.role),
    departmentId: user.departmentId,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ScorecardServiceError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

export async function listScorecardsAction(
  year?: number,
): Promise<ActionResult<Awaited<ReturnType<typeof getScorecards>>>> {
  try {
    const actor = await getActor();
    const scorecards = await getScorecards(actor, year);

    return {
      success: true,
      data: scorecards,
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
    };
  }
}

export async function getScorecardAction(
  scorecardId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getScorecardById>>>> {
  try {
    const actor = await getActor();
    const scorecard = await getScorecardById(actor, scorecardId);

    return {
      success: true,
      data: scorecard,
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
    };
  }
}

export async function createScorecardAction(input: {
  departmentId: string;
  year: number;
}): Promise<ActionResult<Awaited<ReturnType<typeof createScorecard>>>> {
  try {
    const actor = await getActor();

    const scorecard = await createScorecard(actor, input);

    revalidatePath("/scorecards");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: scorecard,
      message: "Scorecard created successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
    };
  }
}

export async function updateScorecardAction(
  scorecardId: string,
  input: {
    departmentId?: string;
    year?: number;
  },
): Promise<ActionResult<Awaited<ReturnType<typeof updateScorecard>>>> {
  try {
    const actor = await getActor();

    const scorecard = await updateScorecard(actor, scorecardId, input);

    revalidatePath("/scorecards");
    revalidatePath(`/scorecards/${scorecardId}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      data: scorecard,
      message: "Scorecard updated successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
    };
  }
}

export async function validateScorecardAction(
  scorecardId: string,
): Promise<ActionResult<{ valid: true }>> {
  try {
    const actor = await getActor();

    const result = await validateScorecardWeights(actor, scorecardId);

    return {
      success: true,
      data: result,
      message: "Scorecard weights are valid.",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
    };
  }
}

export async function deleteScorecardAction(
  scorecardId: string,
): Promise<ActionResult<{ success: true }>> {
  try {
    const actor = await getActor();

    const result = await deleteScorecard(actor, scorecardId);

    revalidatePath("/scorecards");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: result,
      message: "Scorecard deleted successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
    };
  }
}
