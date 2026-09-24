import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";

import { Topbar } from "@/components/layout/topbar";

import type { CurrentUser } from "@/lib/auth-guards";

type AppShellProps = {
  user: CurrentUser;
  children: ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar role={user.role} />

      <div className="lg:pl-68">
        <Topbar username={user.username} role={user.role} />

        <main className="min-h-[calc(100vh-4.5rem)] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
