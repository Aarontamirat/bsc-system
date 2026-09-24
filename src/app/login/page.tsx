import { Suspense } from "react";

import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <div className="text-sm text-slate-300">Loading sign in...</div>
        </main>
      }>
      <LoginForm />
    </Suspense>
  );
}
