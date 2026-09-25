"use client";

import { LogOut, UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { logout } from "@/app/actions/auth";
import Link from "next/link";

type UserMenuProps = {
  username: string;
  role: "ADMIN" | "USER";
};

function initials(username: string): string {
  const normalized = username.trim();

  if (!normalized) {
    return "U";
  }

  return normalized.slice(0, 2).toUpperCase();
}

export function UserMenu({ username, role }: UserMenuProps) {
  const roleLabel = role === "ADMIN" ? "Administrator" : "Department User";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-auto gap-3 rounded-xl px-2.5 py-2 hover:bg-slate-100">
            <Avatar className="h-9 w-9 border border-slate-200">
              <AvatarFallback className="bg-slate-950 text-xs font-semibold text-white">
                {initials(username)}
              </AvatarFallback>
            </Avatar>

            <span className="hidden text-left md:block">
              <span className="block max-w-28 truncate text-sm font-semibold text-slate-800">
                {username}
              </span>

              <span className="block text-xs text-slate-500">{roleLabel}</span>
            </span>
          </Button>
        }
      />

      <DropdownMenuContent
        align="end"
        className="w-60 rounded-2xl p-2 bg-slate-50">
        <DropdownMenuLabel className="px-3 py-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-slate-950 text-white">
                {initials(username)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{username}</p>

              <p className="truncate text-xs text-slate-500">{roleLabel}</p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <Link href="/admin/users">
          <DropdownMenuItem className="gap-3 rounded-xl px-3 py-2.5 hover:cursor-pointer hover:bg-(--accent) transition-all duration-300">
            <UserRound className="h-4 w-4" />
            <span>Account</span>
          </DropdownMenuItem>
        </Link>

        <DropdownMenuSeparator />

        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-600 outline-none transition hover:bg-red-50">
            <LogOut className="h-4 w-4" />

            <span>Sign out</span>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
