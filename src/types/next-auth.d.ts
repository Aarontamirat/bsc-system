import type { UserRole } from "@/generated/prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    role: UserRole;
    departmentId: string;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      role: UserRole;
      departmentId: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string;
    role?: UserRole;
    departmentId?: string;
  }
}
