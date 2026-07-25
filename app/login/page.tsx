"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") ?? "/";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    router.push(returnUrl);
    router.refresh();
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          backgroundColor: "var(--surface-raised)",
          boxShadow: "var(--shadow-card)",
          border: "1px solid var(--border)",
        }}
      >
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-center mb-6" style={{ color: "var(--ink)" }}>
          Sign in
        </h1>

        {error && (
          <div
            id="form-error"
            role="alert"
            className="mb-4 rounded-lg px-4 py-3 text-sm"
            style={{
              backgroundColor: "rgba(168, 66, 47, 0.1)",
              color: "var(--danger)",
              border: "1px solid rgba(168, 66, 47, 0.2)",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--ink)" }}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-describedby={error ? "form-error" : undefined}
              className="block w-full rounded-lg px-3 py-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[var(--accent)]"
              style={{
                backgroundColor: "var(--surface)",
                color: "var(--ink)",
                border: "1px solid var(--border)",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--ink)" }}
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-describedby={error ? "form-error" : undefined}
              className="block w-full rounded-lg px-3 py-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[var(--accent)]"
              style={{
                backgroundColor: "var(--surface)",
                color: "var(--ink)",
                border: "1px solid var(--border)",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            style={
              {
                backgroundColor: loading ? "var(--accent-hover)" : "var(--accent)",
                "--tw-ring-color": "var(--accent)",
              } as React.CSSProperties
            }
            onMouseEnter={(e) => {
              if (!loading) (e.currentTarget.style.backgroundColor = "var(--accent-hover)");
            }}
            onMouseLeave={(e) => {
              if (!loading) (e.currentTarget.style.backgroundColor = "var(--accent)");
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: "var(--ink-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium underline underline-offset-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 rounded-sm"
            style={{ color: "var(--accent)" }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
          <div
            className="w-full max-w-sm rounded-2xl p-8 animate-pulse"
            style={{
              backgroundColor: "var(--surface-raised)",
              boxShadow: "var(--shadow-card)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="h-8 w-24 mx-auto mb-6 rounded" style={{ backgroundColor: "var(--border)" }} />
            <div className="space-y-4">
              <div className="h-10 rounded-lg" style={{ backgroundColor: "var(--border)" }} />
              <div className="h-10 rounded-lg" style={{ backgroundColor: "var(--border)" }} />
              <div className="h-10 rounded-lg" style={{ backgroundColor: "var(--accent)" }} />
            </div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
