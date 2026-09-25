import "server-only";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/client";

export type CurrentUser = {
  id: string;
  username: string;
  role: UserRole;
  departmentId: string;
  departmentName: string;
  isActive: boolean;
};

export class AuthorizationError extends Error {
  public readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "INACTIVE_USER";

  constructor(
    code: "UNAUTHENTICATED" | "FORBIDDEN" | "INACTIVE_USER",
    message: string,
  ) {
    super(message);
    this.name = "AuthorizationError";
    this.code = code;
  }
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      username: true,
      role: true,
      departmentId: true,
      isActive: true,
      department: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  return {
    ...user,
    departmentName: user.department.name,
  };
}

export function canAdministerAllDepartments(
  user: Pick<CurrentUser, "role" | "departmentName">,
): boolean {
  return (
    user.role === UserRole.ADMIN &&
    user.departmentName.trim().toLocaleLowerCase() === "administration"
  );
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthorizationError(
      "UNAUTHENTICATED",
      "You must be authenticated to perform this operation.",
    );
  }

  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();

  if (user.role !== UserRole.ADMIN) {
    throw new AuthorizationError(
      "FORBIDDEN",
      "Administrator privileges are required for this operation.",
    );
  }

  return user;
}

export async function requireDepartmentAccess(
  departmentId: string,
): Promise<CurrentUser> {
  const user = await requireUser();

  if (user.role !== UserRole.ADMIN && user.departmentId !== departmentId) {
    throw new AuthorizationError(
      "FORBIDDEN",
      "You do not have access to this department.",
    );
  }

  return user;
}
