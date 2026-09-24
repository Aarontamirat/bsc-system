"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  ClipboardCheck,
  FileBarChart2,
  Gauge,
  Menu,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { Separator } from "@/components/ui/separator";

import type { AppUserRole } from "@/lib/navigation";

import { getVisibleNavigation } from "@/lib/navigation";

type MobileNavProps = {
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

export function MobileNav({ role }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const groups = getVisibleNavigation(role);

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-xl"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close navigation" : "Open navigation"}>
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px]"
          />

          <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(88vw,340px)] flex-col border-r border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
            <div className="flex h-18 items-center justify-between px-5">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <span className="text-sm font-bold">B</span>
                </div>

                <div>
                  <div className="text-sm font-bold tracking-[0.12em]">
                    BSC SYSTEM
                  </div>

                  <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                    Performance
                  </div>
                </div>
              </Link>

              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl"
                onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <Separator />

            <div className="flex-1 overflow-y-auto px-3 py-5">
              <nav className="space-y-7">
                {groups.map((group) => (
                  <div key={group.label}>
                    <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      {group.label}
                    </div>

                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = iconMap[item.icon];

                        if (!item.enabled) {
                          return (
                            <div
                              key={item.href}
                              className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300">
                              <Icon className="h-4 w-4" />

                              {item.label}
                            </div>
                          );
                        }

                        const active = isActivePath(pathname, item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={[
                              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                              active
                                ? "bg-slate-950 text-white shadow-lg shadow-slate-950/10"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                            ].join(" ")}>
                            <Icon className="h-4 w-4" />

                            {item.label}

                            {active ? (
                              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
                            ) : null}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>

            <div className="border-t border-slate-200 p-4">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <span className="text-xs font-medium text-slate-600">
                  Access
                </span>

                <Badge variant="secondary" className="rounded-full text-[10px]">
                  {role}
                </Badge>
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
