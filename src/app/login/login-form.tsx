"use client";

import { type FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, LogIn, UserRound } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        username: username.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (!result || result.error) {
        setError("Invalid username or password, or the account is inactive.");
        setIsSubmitting(false);
        return;
      }

      // Extracting relative path to preserve browser's current host/IP
      let targetPath = callbackUrl;

      if (result.url) {
        try {
          const parsed = new URL(result.url);
          targetPath = parsed.pathname + parsed.search + parsed.hash;
        } catch {
          targetPath = result.url;
        }
      }

      router.push(targetPath);
      router.refresh();
    } catch {
      setError("Unable to complete the sign-in request. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.22),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(14,165,233,0.18),transparent_35%)]" />

          <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
            <div>
              <div className="mb-10 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-(--background)/5">
                  <span className="text-lg font-bold">B</span>
                </div>

                <div>
                  <div className="font-semibold tracking-wide">BSC SYSTEM</div>
                  <div className="text-xs text-slate-400">
                    Department Performance Management
                  </div>
                </div>
              </div>

              <div className="max-w-xl">
                <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-sky-400">
                  Balanced Scorecard
                </p>
                <h1 className="text-5xl font-semibold leading-tight xl:text-6xl">
                  Measure.
                  <br />
                  Consolidate.
                  <br />
                  Improve.
                </h1>
                <p className="mt-7 max-w-lg text-base leading-7 text-slate-400">
                  A centralized department performance platform for managing
                  objectives, activities, monthly plans, actuals, and
                  consolidated results.
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-500">Internal LAN Application</p>
          </div>
        </section>

        <section className="flex items-center justify-center bg-slate-50 px-6 py-12 text-slate-950">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <span className="text-lg font-bold">B</span>
                </div>

                <div>
                  <div className="font-semibold">BSC SYSTEM</div>
                  <div className="text-xs text-slate-500">
                    Department Performance Management
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-(--background) p-7 shadow-xl shadow-slate-200/50 sm:p-9">
              <div className="mb-8">
                <p className="text-sm font-medium text-sky-600">
                  Secure sign in
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                  Welcome back
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in using your BSC system account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-medium text-slate-700">
                    Username
                  </label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      required
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-sky-500 focus:bg-(--background) focus:ring-4 focus:ring-sky-500/10"
                      placeholder="Username"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-11 text-sm outline-none transition focus:border-sky-500 focus:bg-(--background) focus:ring-4 focus:ring-sky-500/10"
                      placeholder="Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }>
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                  <LogIn className="h-4 w-4" />
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              Authorized internal users only.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
