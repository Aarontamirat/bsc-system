import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth-guards";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <AppShell user={user}>{children}</AppShell>;
}
