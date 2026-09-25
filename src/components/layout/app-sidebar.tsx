"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileBarChart2,
  Gauge,
  HelpCircle,
  LockKeyhole,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { AppUserRole } from "@/lib/navigation";
import { getVisibleNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/layout/sidebar-provider";

type AppSidebarProps = {
  role: AppUserRole;
};

const iconMap = {
  dashboard: Gauge,
  scorecard: BarChart3,
  data: ClipboardCheck,
  report: FileBarChart2,
  department: Building2,
  users: UsersRound,
} as const;

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ role }: AppSidebarProps) {
  const pathname = usePathname();
  const groups = getVisibleNavigation(role);
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-200 bg-(--background) transition-all duration-300 ease-in-out lg:flex",
        isCollapsed ? "w-20" : "w-68",
      )}>
      {/* BRAND & TOGGLE */}
      <div className="flex h-18 items-center justify-between px-4">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 overflow-hidden transition-all duration-300",
            isCollapsed && "justify-center w-full",
          )}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/10">
            <span className="text-sm font-bold">B</span>
          </div>

          {!isCollapsed && (
            <div className="whitespace-nowrap transition-opacity duration-300">
              <div className="text-sm font-bold tracking-[0.12em] text-slate-950">
                BSC SYSTEM
              </div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                Performance
              </div>
            </div>
          )}
        </Link>

        {/* TOGGLE BUTTON */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn(
            "h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800",
            isCollapsed &&
              "absolute -right-3 top-5 z-50 h-7 w-7 rounded-full border border-slate-200 bg-white shadow-md dark:bg-slate-900",
          )}
          aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Separator />

      {/* NAVIGATION */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-5">
        <TooltipProvider>
          <nav aria-label="Primary navigation" className="space-y-6">
            {groups.map((group) => (
              <div key={group.label}>
                {/* Group Heading */}
                {!isCollapsed ? (
                  <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    {group.label}
                  </div>
                ) : (
                  <div className="my-2 h-px bg-slate-100 dark:bg-slate-800" />
                )}

                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon =
                      iconMap[item.icon as keyof typeof iconMap] || HelpCircle;
                    const active = isActivePath(pathname, item.href);

                    /* DISABLED MODULE */
                    if (!item.enabled) {
                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger
                            render={
                              <div
                                aria-disabled="true"
                                className={cn(
                                  "flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300",
                                  isCollapsed && "justify-center px-0",
                                )}>
                                <Icon className="h-4 w-4 shrink-0 text-slate-300" />
                                {!isCollapsed && (
                                  <>
                                    <span className="truncate">
                                      {item.label}
                                    </span>
                                    <LockKeyhole className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300" />
                                  </>
                                )}
                              </div>
                            }
                          />
                          <TooltipContent
                            side="right"
                            className="max-w-72 z-50">
                            <p className="font-medium">{item.label}</p>
                            <p className="text-xs text-slate-400">
                              {item.description} (Not available)
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    /* ACTIVE / ENABLED MODULE */
                    const navLink = (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          active
                            ? "bg-slate-950 text-white shadow-lg shadow-slate-950/10 dark:bg-slate-100 dark:text-slate-950"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                          isCollapsed && "justify-center px-0",
                        )}>
                        <Icon className="h-4 w-4 shrink-0" />
                        {!isCollapsed && (
                          <>
                            <span className="truncate">{item.label}</span>
                            {active ? (
                              <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-white dark:bg-slate-950" />
                            ) : null}
                          </>
                        )}
                      </Link>
                    );

                    /* Show Tooltip when Collapsed */
                    if (isCollapsed) {
                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger render={navLink} />
                          <TooltipContent
                            side="right"
                            className="z-50 font-medium">
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return navLink;
                  })}
                </div>
              </div>
            ))}
          </nav>
        </TooltipProvider>
      </div>

      {/* ACCESS LEVEL CARD */}
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        {!isCollapsed ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Access level
              </span>
              <Badge
                variant="secondary"
                className="rounded-full px-2 py-0.5 text-[10px]">
                {role}
              </Badge>
            </div>
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Your available modules are determined by your assigned system
              role.
            </p>
          </div>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="flex justify-center p-2">
                    <ShieldCheck className="h-5 w-5 text-slate-500" />
                  </div>
                }
              />
              <TooltipContent side="right" className="z-50">
                <p className="font-semibold">Role: {role}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </aside>
  );
}
