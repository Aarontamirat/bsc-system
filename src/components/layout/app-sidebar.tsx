import Link from "next/link";
import {
  BarChart3,
  Building2,
  ClipboardCheck,
  FileBarChart2,
  Gauge,
  LockKeyhole,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { AppUserRole } from "@/lib/navigation";
import { getVisibleNavigation } from "@/lib/navigation";

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

export function AppSidebar({ role }: AppSidebarProps) {
  const groups = getVisibleNavigation(role);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-68 flex-col border-r border-slate-200 bg-white lg:flex">
      {/* ------------------------------------------------------------------ */}
      {/* BRAND                                                              */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex h-18 items-center px-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/10">
            <span className="text-sm font-bold">B</span>
          </div>

          <div>
            <div className="text-sm font-bold tracking-[0.12em] text-slate-950">
              BSC SYSTEM
            </div>

            <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
              Performance Management
            </div>
          </div>
        </Link>
      </div>

      <Separator />

      {/* ------------------------------------------------------------------ */}
      {/* NAVIGATION                                                         */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <TooltipProvider>
          <nav aria-label="Primary navigation" className="space-y-7">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {group.label}
                </div>

                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = iconMap[item.icon];

                    /* ---------------------------------------------------- */
                    /* DISABLED MODULE                                     */
                    /* ---------------------------------------------------- */

                    if (!item.enabled) {
                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger
                            render={
                              <div
                                aria-disabled="true"
                                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300">
                                <Icon className="h-4 w-4 shrink-0 text-slate-300" />

                                <span>{item.label}</span>

                                <LockKeyhole className="ml-auto h-3.5 w-3.5 text-slate-300" />
                              </div>
                            }
                          />

                          <TooltipContent side="right" className="max-w-72">
                            <p className="font-medium">{item.description}</p>

                            <p className="mt-1 text-xs text-slate-400">
                              This module is not available yet.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    /* ---------------------------------------------------- */
                    /* ACTIVE MODULE                                        */
                    /* ---------------------------------------------------- */

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-950">
                        <Icon className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:scale-105 group-hover:text-slate-700" />

                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </TooltipProvider>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* ACCESS CARD                                                        */}
      {/* ------------------------------------------------------------------ */}

      <div className="border-t border-slate-200 p-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Access level
            </span>

            <Badge
              variant="secondary"
              className="rounded-full px-2 py-0.5 text-[10px]">
              {role === "ADMIN" ? "ADMIN" : "USER"}
            </Badge>
          </div>

          <p className="text-xs leading-5 text-slate-500">
            Your available modules are determined by your assigned system role.
          </p>
        </div>
      </div>
    </aside>
  );
}
