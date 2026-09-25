import "server-only";

import bcrypt from "bcrypt";

import { UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ScorecardServiceError,
  type ScorecardActor,
} from "@/lib/services/scorecard.service";

export type DepartmentInput = { name: string; description?: string };

export type UserInput = {
  username: string;
  role: UserRole;
  departmentId: string;
  isActive: boolean;
  password?: string;
};

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

function assertAdministrator(actor: ScorecardActor): void {
  if (actor.role !== UserRole.ADMIN) {
    throw new ScorecardServiceError(
      "Administrator privileges are required for this operation.",
      "FORBIDDEN",
    );
  }
}

function assertDepartmentScope(
  actor: ScorecardActor,
  departmentId: string,
): void {
  assertAdministrator(actor);

  if (
    !actor.canAdministerAllDepartments &&
    actor.departmentId !== departmentId
  ) {
    throw new ScorecardServiceError(
      "Department administrators can manage only their own department.",
      "FORBIDDEN",
    );
  }
}

function assertGlobalAdministration(actor: ScorecardActor): void {
  assertAdministrator(actor);

  if (!actor.canAdministerAllDepartments) {
    throw new ScorecardServiceError(
      "Only Administration department administrators can create departments.",
      "FORBIDDEN",
    );
  }
}

function assertPassword(password: string): void {
  if (password.length < 12) {
    throw new ScorecardServiceError(
      "Passwords must contain at least 12 characters.",
      "VALIDATION_ERROR",
    );
  }
}

async function getActiveDepartment(departmentId: string) {
  const department = await prisma.department.findFirst({
    where: { id: departmentId, isActive: true },
    select: { id: true },
  });

  if (!department) {
    throw new ScorecardServiceError(
      "Select an active department.",
      "VALIDATION_ERROR",
    );
  }

  return department;
}

export async function listDepartments(actor: ScorecardActor) {
  assertAdministrator(actor);

  return prisma.department.findMany({
    where: actor.canAdministerAllDepartments
      ? undefined
      : { id: actor.departmentId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          users: true,
          scorecards: true,
          responsibleActivities: true,
        },
      },
    },
  });
}

export async function createDepartment(
  actor: ScorecardActor,
  input: DepartmentInput,
) {
  assertGlobalAdministration(actor);
  const name = normalizeName(input.name);

  if (!name) {
    throw new ScorecardServiceError(
      "Department name is required.",
      "VALIDATION_ERROR",
    );
  }

  return prisma.department.create({
    data: {
      name,
      description: input.description?.trim() || null,
      isActive: true,
    },
  });
}

export async function updateDepartment(
  actor: ScorecardActor,
  departmentId: string,
  input: DepartmentInput & { isActive: boolean },
) {
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, name: true },
  });

  if (!department) {
    throw new ScorecardServiceError("Department not found.", "NOT_FOUND");
  }

  assertDepartmentScope(actor, department.id);
  const name = normalizeName(input.name);

  if (!name) {
    throw new ScorecardServiceError(
      "Department name is required.",
      "VALIDATION_ERROR",
    );
  }

  if (
    department.name.trim().toLocaleLowerCase() === "administration" &&
    (name.toLocaleLowerCase() !== "administration" || !input.isActive)
  ) {
    throw new ScorecardServiceError(
      "The Administration department must remain active and keep its name.",
      "CONFLICT",
    );
  }

  return prisma.department.update({
    where: { id: departmentId },
    data: {
      name,
      description: input.description?.trim() || null,
      isActive: input.isActive,
    },
  });
}

export async function deleteDepartment(
  actor: ScorecardActor,
  departmentId: string,
) {
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    include: {
      _count: {
        select: {
          users: true,
          scorecards: true,
          responsibleActivities: true,
        },
      },
    },
  });

  if (!department) {
    throw new ScorecardServiceError("Department not found.", "NOT_FOUND");
  }

  assertDepartmentScope(actor, department.id);

  if (department.name.trim().toLocaleLowerCase() === "administration") {
    throw new ScorecardServiceError(
      "The Administration department cannot be deleted.",
      "CONFLICT",
    );
  }

  if (
    department._count.users > 0 ||
    department._count.scorecards > 0 ||
    department._count.responsibleActivities > 0
  ) {
    throw new ScorecardServiceError(
      "This department is referenced by users, scorecards, or activities. Deactivate it instead of deleting history.",
      "CONFLICT",
    );
  }

  await prisma.department.delete({ where: { id: departmentId } });
}

export async function listUsers(actor: ScorecardActor) {
  // Non-admins only get their own profile
  if (actor.role !== UserRole.ADMIN) {
    return prisma.user.findMany({
      where: { id: actor.userId },
      orderBy: { username: "asc" },
      select: {
        id: true,
        username: true,
        role: true,
        departmentId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        department: { select: { name: true } },
      },
    });
  }

  // Admins get department-scoped or global user list
  return prisma.user.findMany({
    where: actor.canAdministerAllDepartments
      ? undefined
      : { departmentId: actor.departmentId },
    orderBy: { username: "asc" },
    select: {
      id: true,
      username: true,
      role: true,
      departmentId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      department: { select: { name: true } },
    },
  });
}

async function assertCanChangeAdminState(
  existing: {
    id: string;
    departmentId: string;
    role: UserRole;
    isActive: boolean;
  },
  input: UserInput,
): Promise<void> {
  const remainsActiveAdminInDepartment =
    input.departmentId === existing.departmentId &&
    input.role === UserRole.ADMIN &&
    input.isActive;

  if (
    existing.role !== UserRole.ADMIN ||
    !existing.isActive ||
    remainsActiveAdminInDepartment
  ) {
    return;
  }

  const otherActiveAdminCount = await prisma.user.count({
    where: {
      departmentId: existing.departmentId,
      role: UserRole.ADMIN,
      isActive: true,
      NOT: { id: existing.id },
    },
  });

  if (otherActiveAdminCount === 0) {
    throw new ScorecardServiceError(
      "At least one active administrator must remain in this department.",
      "CONFLICT",
    );
  }
}

export async function createUser(actor: ScorecardActor, input: UserInput) {
  assertDepartmentScope(actor, input.departmentId);
  const username = normalizeUsername(input.username);
  const password = input.password ?? "";

  if (!username) {
    throw new ScorecardServiceError(
      "Username is required.",
      "VALIDATION_ERROR",
    );
  }

  assertPassword(password);
  await getActiveDepartment(input.departmentId);
  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.user.create({
    data: {
      username,
      passwordHash,
      role: input.role,
      departmentId: input.departmentId,
      isActive: input.isActive,
    },
    select: { id: true },
  });
}

export async function updateUser(
  actor: ScorecardActor,
  userId: string,
  input: UserInput,
) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      departmentId: true,
      role: true,
      isActive: true,
    },
  });

  if (!existing) {
    throw new ScorecardServiceError("User not found.", "NOT_FOUND");
  }

  const isAdmin = actor.role === UserRole.ADMIN;

  if (isAdmin) {
    // Admin checks
    assertDepartmentScope(actor, existing.departmentId);
    assertDepartmentScope(actor, input.departmentId);
    await getActiveDepartment(input.departmentId);
    await assertCanChangeAdminState(existing, input);
  } else {
    // Non-admin check: only update own account
    if (actor.userId !== userId) {
      throw new ScorecardServiceError(
        "You are only authorized to update your own account details.",
        "FORBIDDEN",
      );
    }
  }

  const username = normalizeUsername(input.username);
  if (!username) {
    throw new ScorecardServiceError(
      "Username is required.",
      "VALIDATION_ERROR",
    );
  }

  // Prevent non-admins from changing role, departmentId, or active state even if form payloads are tampered
  const finalRole = isAdmin ? input.role : existing.role;
  const finalDepartmentId = isAdmin
    ? input.departmentId
    : existing.departmentId;
  const finalIsActive = isAdmin ? input.isActive : existing.isActive;

  const data: {
    username: string;
    role: UserRole;
    departmentId: string;
    isActive: boolean;
    passwordHash?: string;
  } = {
    username,
    role: finalRole,
    departmentId: finalDepartmentId,
    isActive: finalIsActive,
  };

  if (input.password) {
    assertPassword(input.password);
    data.passwordHash = await bcrypt.hash(input.password, 12);
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true },
  });
}
