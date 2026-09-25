"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getScorecardActor,
  getScorecardActorOrRedirect,
} from "@/lib/scorecard-actor";
import {
  createDepartment,
  createUser,
  deleteDepartment,
  updateDepartment,
  updateUser,
} from "@/lib/services/admin.service";
import { ScorecardServiceError } from "@/lib/services/scorecard.service";
import { UserRole } from "@/generated/prisma/client";

function value(formData: FormData, key: string): string {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw : "";
}

function boolValue(formData: FormData, key: string): boolean {
  return value(formData, key) === "on";
}

function roleValue(raw: string): UserRole {
  return raw === UserRole.ADMIN ? UserRole.ADMIN : UserRole.USER;
}

function redirectWithMessage(
  path: string,
  message: string,
  ok: boolean,
): never {
  const params = new URLSearchParams({
    [ok ? "message" : "error"]: message,
  });

  redirect(`${path}?${params.toString()}`);
}

function errorMessage(error: unknown): string {
  if (error instanceof ScorecardServiceError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

async function getAdminActor() {
  const actor = await getScorecardActor();

  if (actor.role !== UserRole.ADMIN) {
    throw new ScorecardServiceError(
      "Administrator privileges are required for this operation.",
      "FORBIDDEN",
    );
  }

  return actor;
}

export async function createDepartmentAction(formData: FormData) {
  try {
    const actor = await getAdminActor();
    await createDepartment(actor, {
      name: value(formData, "name"),
      description: value(formData, "description"),
    });
    revalidatePath("/admin/departments");
  } catch (error) {
    redirectWithMessage("/admin/departments", errorMessage(error), false);
  }
  redirectWithMessage("/admin/departments", "Department created.", true);
}

export async function updateDepartmentAction(formData: FormData) {
  try {
    const actor = await getAdminActor();
    await updateDepartment(actor, value(formData, "id"), {
      name: value(formData, "name"),
      description: value(formData, "description"),
      isActive: boolValue(formData, "isActive"),
    });
    revalidatePath("/admin/departments");
  } catch (error) {
    redirectWithMessage("/admin/departments", errorMessage(error), false);
  }
  redirectWithMessage("/admin/departments", "Department updated.", true);
}

export async function deleteDepartmentAction(formData: FormData) {
  try {
    const actor = await getAdminActor();
    await deleteDepartment(actor, value(formData, "id"));
    revalidatePath("/admin/departments");
  } catch (error) {
    redirectWithMessage("/admin/departments", errorMessage(error), false);
  }
  redirectWithMessage("/admin/departments", "Department deleted.", true);
}

export async function createUserAction(formData: FormData) {
  try {
    const actor = await getAdminActor();
    await createUser(actor, {
      username: value(formData, "username"),
      password: value(formData, "password"),
      role: roleValue(value(formData, "role")),
      departmentId: value(formData, "departmentId"),
      isActive: boolValue(formData, "isActive"),
    });
    revalidatePath("/admin/users");
  } catch (error) {
    redirectWithMessage("/admin/users", errorMessage(error), false);
  }
  redirectWithMessage("/admin/users", "User created.", true);
}

export async function updateUserAction(formData: FormData) {
  try {
    const actor = await getScorecardActorOrRedirect();
    const targetUserId = value(formData, "id");
    await updateUser(actor, targetUserId, {
      username: value(formData, "username"),
      password: value(formData, "password") || undefined,
      role: roleValue(value(formData, "role")),
      departmentId: value(formData, "departmentId"),
      isActive: boolValue(formData, "isActive"),
    });
    revalidatePath("/admin/users");
  } catch (error) {
    redirectWithMessage("/admin/users", errorMessage(error), false);
  }
  redirectWithMessage("/admin/users", "User updated.", true);
}
