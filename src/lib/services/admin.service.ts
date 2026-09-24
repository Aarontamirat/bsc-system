import "server-only";

import bcrypt from "bcrypt";

import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/client";
import { ScorecardServiceError } from "@/lib/services/scorecard.service";

export type DepartmentInput = {
  name: string;
  description?: string;
};

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

function assertPassword(password: string): void {
  if (password.length < 12) {
    throw new ScorecardServiceError(
      "Passwords must contain at least 12 characters.",
      "VALIDATION_ERROR",
    );
  }
}

export async function listDepartments() {
  return prisma.department.findMany({
    orderBy: {
      name: "asc",
    },
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

export async function createDepartment(input: DepartmentInput) {
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
  departmentId: string,
  input: DepartmentInput & { isActive: boolean },
) {
  const name = normalizeName(input.name);

  if (!name) {
    throw new ScorecardServiceError(
      "Department name is required.",
      "VALIDATION_ERROR",
    );
  }

  return prisma.department.update({
    where: {
      id: departmentId,
    },
    data: {
      name,
      description: input.description?.trim() || null,
      isActive: input.isActive,
    },
  });
}

export async function deleteDepartment(departmentId: string) {
  const department = await prisma.department.findUnique({
    where: {
      id: departmentId,
    },
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

  await prisma.department.delete({
    where: {
      id: departmentId,
    },
  });
}

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: {
      username: "asc",
    },
    select: {
      id: true,
      username: true,
      role: true,
      departmentId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      department: {
        select: {
          name: true,
        },
      },
    },
  });
}

async function assertCanChangeAdminState(
  userId: string,
  nextRole: UserRole,
  nextActive: boolean,
): Promise<void> {
  const existing = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      role: true,
      isActive: true,
    },
  });

  if (!existing || existing.role !== UserRole.ADMIN || !existing.isActive) {
    return;
  }

  if (nextRole === UserRole.ADMIN && nextActive) {
    return;
  }

  const activeAdminCount = await prisma.user.count({
    where: {
      role: UserRole.ADMIN,
      isActive: true,
      NOT: {
        id: userId,
      },
    },
  });

  if (activeAdminCount === 0) {
    throw new ScorecardServiceError(
      "At least one active administrator must remain.",
      "CONFLICT",
    );
  }
}

export async function createUser(input: UserInput) {
  const username = normalizeUsername(input.username);
  const password = input.password ?? "";

  if (!username) {
    throw new ScorecardServiceError("Username is required.", "VALIDATION_ERROR");
  }

  assertPassword(password);

  const department = await prisma.department.findUnique({
    where: {
      id: input.departmentId,
    },
    select: {
      id: true,
    },
  });

  if (!department) {
    throw new ScorecardServiceError("Department not found.", "NOT_FOUND");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.user.create({
    data: {
      username,
      passwordHash,
      role: input.role,
      departmentId: input.departmentId,
      isActive: input.isActive,
    },
    select: {
      id: true,
    },
  });
}

export async function updateUser(userId: string, input: UserInput) {
  const username = normalizeUsername(input.username);

  if (!username) {
    throw new ScorecardServiceError("Username is required.", "VALIDATION_ERROR");
  }

  await assertCanChangeAdminState(userId, input.role, input.isActive);

  const data: {
    username: string;
    role: UserRole;
    departmentId: string;
    isActive: boolean;
    passwordHash?: string;
  } = {
    username,
    role: input.role,
    departmentId: input.departmentId,
    isActive: input.isActive,
  };

  if (input.password) {
    assertPassword(input.password);
    data.passwordHash = await bcrypt.hash(input.password, 12);
  }

  return prisma.user.update({
    where: {
      id: userId,
    },
    data,
    select: {
      id: true,
    },
  });
}
