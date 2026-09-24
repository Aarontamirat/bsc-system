"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth-guards";
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

function redirectWithMessage(path: string, message: string, ok: boolean): never {
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

export async function createDepartmentAction(formData: FormData) {
  await requireAdmin();

  try {
    await createDepartment({
      name: value(formData, "name"),
      description: value(formData, "description"),
    });
    revalidatePath("/admin/departments");
    redirectWithMessage("/admin/departments", "Department created.", true);
  } catch (error) {
    redirectWithMessage("/admin/departments", errorMessage(error), false);
  }
}

export async function updateDepartmentAction(formData: FormData) {
  await requireAdmin();

  try {
    await updateDepartment(value(formData, "id"), {
      name: value(formData, "name"),
      description: value(formData, "description"),
      isActive: boolValue(formData, "isActive"),
    });
    revalidatePath("/admin/departments");
    redirectWithMessage("/admin/departments", "Department updated.", true);
  } catch (error) {
    redirectWithMessage("/admin/departments", errorMessage(error), false);
  }
}

export async function deleteDepartmentAction(formData: FormData) {
  await requireAdmin();

  try {
    await deleteDepartment(value(formData, "id"));
    revalidatePath("/admin/departments");
    redirectWithMessage("/admin/departments", "Department deleted.", true);
  } catch (error) {
    redirectWithMessage("/admin/departments", errorMessage(error), false);
  }
}

export async function createUserAction(formData: FormData) {
  await requireAdmin();

  try {
    await createUser({
      username: value(formData, "username"),
      password: value(formData, "password"),
      role: roleValue(value(formData, "role")),
      departmentId: value(formData, "departmentId"),
      isActive: boolValue(formData, "isActive"),
    });
    revalidatePath("/admin/users");
    redirectWithMessage("/admin/users", "User created.", true);
  } catch (error) {
    redirectWithMessage("/admin/users", errorMessage(error), false);
  }
}

export async function updateUserAction(formData: FormData) {
  await requireAdmin();

  try {
    await updateUser(value(formData, "id"), {
      username: value(formData, "username"),
      password: value(formData, "password") || undefined,
      role: roleValue(value(formData, "role")),
      departmentId: value(formData, "departmentId"),
      isActive: boolValue(formData, "isActive"),
    });
    revalidatePath("/admin/users");
    redirectWithMessage("/admin/users", "User updated.", true);
  } catch (error) {
    redirectWithMessage("/admin/users", errorMessage(error), false);
  }
}
