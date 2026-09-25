import "server-only";

import { redirect } from "next/navigation";

import { canAdministerAllDepartments, getCurrentUser } from "@/lib/auth-guards";
import {
  ScorecardServiceError,
  type ScorecardActor,
} from "@/lib/services/scorecard.service";

export async function getScorecardActor(): Promise<ScorecardActor> {
  const user = await getCurrentUser();

  if (!user) {
    throw new ScorecardServiceError("You must be signed in.", "UNAUTHORIZED");
  }

  return {
    userId: user.id,
    role: user.role,
    departmentId: user.departmentId,
    canAdministerAllDepartments: canAdministerAllDepartments(user),
  };
}

export async function getScorecardActorOrRedirect(): Promise<ScorecardActor> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return {
    userId: user.id,
    role: user.role,
    departmentId: user.departmentId,
    canAdministerAllDepartments: canAdministerAllDepartments(user),
  };
}
