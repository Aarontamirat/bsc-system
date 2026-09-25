import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-(--background) p-8 text-center shadow-xl shadow-slate-200/50 sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <ShieldAlert className="h-6 w-6" />
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-red-500">
          Access restricted
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          You are not authorised
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
          Your account does not have the permissions required for this area of
          the BSC System.
        </p>

        <div className="mt-7">
          <Button render={<Link href="/dashboard" />} className="rounded-xl">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to dashboard
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
