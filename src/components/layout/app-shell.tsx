"use client";

import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";

import { SidebarProvider, useSidebar } from "./sidebar-provider";

import { Topbar } from "@/components/layout/topbar";

import type { CurrentUser } from "@/lib/auth-guards";

import { cn } from "@/lib/utils";

type AppShellProps = {
  user: CurrentUser;
  children: ReactNode;
};

function AppShellInner({ user, children }: AppShellProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-(--background)">
      <AppSidebar role={user.role} />

      {/* Main COntent Area adjusts pasdding smoothly as sidebar collapses */}
      <div
        className={cn(
          "transition-[padding] duration-300 ease-in-out",
          isCollapsed ? "lg:pl-20" : "lg:pl-68",
        )}>
        <Topbar username={user.username} role={user.role} />

        <main className="min-h-[calc(100vh-4.5rem)] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AppShell({ user, children }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppShellInner user={user}>{children}</AppShellInner>
    </SidebarProvider>
  );
}
