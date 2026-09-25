"use server";

import { revalidatePath } from "next/cache";
import { UnitOfMeasure } from "@/generated/prisma";

import {
  createActivity,
  createObjective,
  createPerspective,
  deleteActivity,
  deleteObjective,
  deletePerspective,
  getScorecardStructure,
  updateActivity,
  updateObjective,
  updatePerspective,
} from "@/lib/services/scorecard-structure.service";

import {
  ScorecardServiceError,
  type ScorecardActor,
} from "@/lib/services/scorecard.service";
import { getScorecardActor } from "@/lib/scorecard-actor";

type ActionResult<T = unknown> =
  | {
      success: true;
      data?: T;
      message?: string;
    }
  | {
      success: false;
      message: string;
    };

async function getActor(): Promise<ScorecardActor> {
  return getScorecardActor();
}

function handleError(error: unknown): ActionResult {
  if (error instanceof ScorecardServiceError) {
    return {
      success: false,
      message: error.message,
    };
  }

  console.error(error);

  return {
    success: false,
    message: "An unexpected error occurred.",
  };
}

/* -------------------------------------------------------------------------- */
/* READ                                                                       */
/* -------------------------------------------------------------------------- */

export async function getScorecardStructureAction(
  scorecardId: string,
): Promise<ActionResult> {
  try {
    const actor = await getActor();

    const data = await getScorecardStructure(actor, scorecardId);

    return {
      success: true,
      data,
    };
  } catch (error) {
    return handleError(error);
  }
}

/* -------------------------------------------------------------------------- */
/* PERSPECTIVE                                                                */
/* -------------------------------------------------------------------------- */

export async function createPerspectiveAction(input: {
  scorecardId: string;
  name: string;
  weight: number;
}): Promise<ActionResult> {
  try {
    const actor = await getActor();

    const data = await createPerspective(actor, input);

    revalidatePath(`/scorecards/${input.scorecardId}`);
    revalidatePath("/scorecards");

    return {
      success: true,
      data,
      message: "Perspective created successfully.",
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function updatePerspectiveAction(input: {
  id: string;
  scorecardId: string;
  name: string;
  weight: number;
}): Promise<ActionResult> {
  try {
    const actor = await getActor();

    const data = await updatePerspective(actor, input);

    revalidatePath(`/scorecards/${input.scorecardId}`);
    revalidatePath("/scorecards");

    return {
      success: true,
      data,
      message: "Perspective updated successfully.",
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function deletePerspectiveAction(input: {
  id: string;
  scorecardId: string;
}): Promise<ActionResult> {
  try {
    const actor = await getActor();

    const data = await deletePerspective(actor, input.id);

    revalidatePath(`/scorecards/${input.scorecardId}`);
    revalidatePath("/scorecards");

    return {
      success: true,
      data,
      message: "Perspective deleted successfully.",
    };
  } catch (error) {
    return handleError(error);
  }
}

/* -------------------------------------------------------------------------- */
/* OBJECTIVE                                                                  */
/* -------------------------------------------------------------------------- */

export async function createObjectiveAction(input: {
  perspectiveId: string;
  scorecardId: string;
  name: string;
  weight: number;
}): Promise<ActionResult> {
  try {
    const actor = await getActor();

    const data = await createObjective(actor, input);

    revalidatePath(`/scorecards/${input.scorecardId}`);

    return {
      success: true,
      data,
      message: "Objective created successfully.",
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function updateObjectiveAction(input: {
  id: string;
  scorecardId: string;
  name: string;
  weight: number;
}): Promise<ActionResult> {
  try {
    const actor = await getActor();

    const data = await updateObjective(actor, input);

    revalidatePath(`/scorecards/${input.scorecardId}`);

    return {
      success: true,
      data,
      message: "Objective updated successfully.",
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteObjectiveAction(input: {
  id: string;
  scorecardId: string;
}): Promise<ActionResult> {
  try {
    const actor = await getActor();

    const data = await deleteObjective(actor, input.id);

    revalidatePath(`/scorecards/${input.scorecardId}`);

    return {
      success: true,
      data,
      message: "Objective deleted successfully.",
    };
  } catch (error) {
    return handleError(error);
  }
}

/* -------------------------------------------------------------------------- */
/* ACTIVITY                                                                   */
/* -------------------------------------------------------------------------- */

export async function createActivityAction(input: {
  objectiveId: string;
  scorecardId: string;
  name: string;
  weight: number;
  unitOfMeasure: UnitOfMeasure;
  annualTarget: number;
  baseline?: number;
  remark?: string;
  responsibleDepartmentIds: string[];
}): Promise<ActionResult> {
  try {
    const actor = await getActor();

    const data = await createActivity(actor, input);

    revalidatePath(`/scorecards/${input.scorecardId}`);

    return {
      success: true,
      data,
      message: "Activity created successfully.",
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function updateActivityAction(input: {
  id: string;
  scorecardId: string;
  name: string;
  weight: number;
  unitOfMeasure: UnitOfMeasure;
  annualTarget: number;
  baseline?: number;
  remark?: string;
  responsibleDepartmentIds: string[];
}): Promise<ActionResult> {
  try {
    const actor = await getActor();

    const data = await updateActivity(actor, input);

    revalidatePath(`/scorecards/${input.scorecardId}`);

    return {
      success: true,
      data,
      message: "Activity updated successfully.",
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteActivityAction(input: {
  id: string;
  scorecardId: string;
}): Promise<ActionResult> {
  try {
    const actor = await getActor();

    const data = await deleteActivity(actor, input.id);

    revalidatePath(`/scorecards/${input.scorecardId}`);

    return {
      success: true,
      data,
      message: "Activity deleted successfully.",
    };
  } catch (error) {
    return handleError(error);
  }
}
