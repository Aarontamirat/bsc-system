"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getScorecardActor } from "@/lib/scorecard-actor";
import {
  getMonthlyWorkspace,
  initializeMonthlyPlans,
  saveMonthlyActuals,
  saveMonthlyPlans,
} from "@/lib/services/monthly-data.service";
import { ScorecardServiceError } from "@/lib/services/scorecard.service";
import type { MonthlyWorkspaceDto } from "@/lib/monthly-data-types";

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

const monthlyValueSchema = z.object({
  activityId: z.string().min(1),
  monthIndex: z.number().int().min(0).max(11),
  value: z.number().finite().min(0),
});

const saveMonthlyValuesSchema = z.object({
  scorecardId: z.string().min(1),
  values: z.array(monthlyValueSchema),
});

function errorMessage(error: unknown): string {
  if (error instanceof ScorecardServiceError) {
    return error.message;
  }

  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Invalid monthly data.";
  }

  console.error(error);
  return "An unexpected error occurred.";
}

export async function getMonthlyWorkspaceAction(
  scorecardId?: string,
): Promise<ActionResult<MonthlyWorkspaceDto>> {
  try {
    const actor = await getScorecardActor();
    const data = await getMonthlyWorkspace(actor, scorecardId);

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      message: errorMessage(error),
    };
  }
}

export async function initializeMonthlyPlansAction(
  scorecardId: string,
): Promise<ActionResult<{ created: number }>> {
  try {
    const actor = await getScorecardActor();
    const data = await initializeMonthlyPlans(actor, scorecardId);

    revalidatePath("/data-entry");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return {
      success: true,
      data,
      message:
        data.created === 0
          ? "No missing monthly plans were found."
          : `Created ${data.created} monthly plan records.`,
    };
  } catch (error) {
    return {
      success: false,
      message: errorMessage(error),
    };
  }
}

export async function saveMonthlyPlansAction(
  input: z.input<typeof saveMonthlyValuesSchema>,
): Promise<ActionResult<{ saved: number }>> {
  try {
    const actor = await getScorecardActor();
    const parsed = saveMonthlyValuesSchema.parse(input);
    const data = await saveMonthlyPlans(actor, parsed.scorecardId, parsed.values);

    revalidatePath("/data-entry");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return {
      success: true,
      data,
      message: `Saved ${data.saved} monthly plan values.`,
    };
  } catch (error) {
    return {
      success: false,
      message: errorMessage(error),
    };
  }
}

export async function saveMonthlyActualsAction(
  input: z.input<typeof saveMonthlyValuesSchema>,
): Promise<ActionResult<{ saved: number }>> {
  try {
    const actor = await getScorecardActor();
    const parsed = saveMonthlyValuesSchema.parse(input);
    const data = await saveMonthlyActuals(
      actor,
      parsed.scorecardId,
      parsed.values,
    );

    revalidatePath("/data-entry");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return {
      success: true,
      data,
      message: `Saved ${data.saved} monthly actual values.`,
    };
  } catch (error) {
    return {
      success: false,
      message: errorMessage(error),
    };
  }
}
