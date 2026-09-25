"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { UserMenu } from "@/components/layout/user-menu";

import { MobileNav } from "@/components/layout/mobile-nav";

import type { AppUserRole } from "@/lib/navigation";

import { navigationGroups } from "@/lib/navigation";

type TopbarProps = {
  username: string;
  role: AppUserRole;
};

function getPageTitle(pathname: string): {
  title: string;
  description: string;
} {
  if (pathname === "/dashboard") {
    return {
      title: "Dashboard",
      description: "Department performance overview",
    };
  }

  for (const group of navigationGroups) {
    for (const item of group.items) {
      if (
        item.enabled &&
        (pathname === item.href || pathname.startsWith(`${item.href}/`))
      ) {
        return {
          title: item.label,
          description: item.description,
        };
      }
    }
  }

  return {
    title: "BSC System",
    description: "Department performance management",
  };
}

export function Topbar({ username, role }: TopbarProps) {
  const pathname = usePathname();

  const page = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-(--background)/90 backdrop-blur-xl">
      <div className="flex min-h-18 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <MobileNav role={role} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-semibold text-slate-950 sm:text-lg">
              {page.title}
            </h1>
          </div>

          <p className="hidden truncate text-xs text-slate-500 sm:block">
            {page.description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            disabled
            className="h-10 w-10 rounded-xl text-slate-400"
            aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="hidden h-8 sm:block" />

          <UserMenu username={username} role={role} />
        </div>
      </div>
    </header>
  );
}
