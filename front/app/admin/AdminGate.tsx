"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, type User } from "@/lib/api";

/**
 * Shows the admin pages to a signed-in admin only; anyone not signed in is sent to the login page.
 * This only decides what is shown: the backend checks the session on every admin request.
 */
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // undefined while the session is being checked
  const [user, setUser] = useState<User | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    auth.me().then(
      (current) => {
        if (!active) return;
        if (current) setUser(current);
        else router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      },
      (e) => active && setError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      active = false;
    };
  }, [router]);

  if (user?.role === "admin") return children;

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="card flex w-full max-w-sm flex-col gap-4 p-6">
        {error ? (
          <div className="banner-error" role="alert">
            {error}
          </div>
        ) : user ? (
          <>
            <h1 className="text-xl font-semibold">Admins only</h1>
            <p className="text-muted">
              You are signed in as <span className="text-foreground">{user.email}</span>, which is not an admin account.
            </p>
            <Link href="/login" className="btn btn-primary">
              Switch account
            </Link>
          </>
        ) : (
          <p className="text-muted">Checking your session…</p>
        )}
        <Link href="/" className="text-muted hover:text-foreground">
          ← Front page
        </Link>
      </div>
    </main>
  );
}
