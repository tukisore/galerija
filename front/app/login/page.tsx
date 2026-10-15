"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, type User } from "@/lib/api";

const codeLength = 8;

export default function LoginPage() {
  const router = useRouter();
  // undefined while the session is being checked, null when signed out
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    auth.me().then(
      (current) => active && setUser(current),
      () => active && setUser(null),
    );
    return () => {
      active = false;
    };
  }, []);

  /** Runs a request, showing its error if it fails; resolves to whether it worked. */
  async function attempt(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    if (await attempt(async () => void (await auth.requestCode(email.trim())))) setStep("code");
  }

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    await attempt(async () => {
      setUser(await auth.login(email.trim(), code));
      setCode("");
      setStep("email");
      // back to the page that asked for the sign-in; only a path on this site is followed
      const next = new URLSearchParams(window.location.search).get("next");
      if (next && /^\/(?![/\\])/.test(next)) router.replace(next);
    });
  }

  async function signOut() {
    await attempt(async () => {
      await auth.logout();
      setUser(null);
    });
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="card flex w-full max-w-sm flex-col gap-4 p-6">
        <h1 className="text-xl font-semibold">{user ? "You are signed in" : "Sign in"}</h1>

        {error && (
          <div className="banner-error" role="alert">
            {error}
          </div>
        )}

        {user === undefined && <p className="text-muted">Checking your session…</p>}

        {user && (
          <>
            <div>
              <div className="font-medium">{user.name}</div>
              <div className="text-muted">{user.email}</div>
              <span className="badge mt-2 capitalize">{user.role}</span>
            </div>
            <button className="btn btn-primary" onClick={signOut} disabled={busy}>
              Log out
            </button>
          </>
        )}

        {user === null && step === "email" && (
          <form onSubmit={sendCode} className="flex flex-col gap-4">
            <label className="label">
              Email
              <input
                className="input"
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </label>
            <button className="btn btn-primary" disabled={busy}>
              Send login code
            </button>
          </form>
        )}

        {user === null && step === "code" && (
          <form onSubmit={signIn} className="flex flex-col gap-4">
            <p className="text-muted">
              If <span className="text-foreground">{email.trim()}</span> is registered, we sent it an {codeLength}
              -digit code. It is valid for 10 minutes.
            </p>
            <label className="label">
              Login code
              <input
                className="input font-mono tracking-[0.3em]"
                required
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern={`[0-9]{${codeLength}}`}
                title={`${codeLength} digits`}
                maxLength={codeLength}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </label>
            <button className="btn btn-primary" disabled={busy || code.length !== codeLength}>
              Sign in
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
            >
              Use a different email
            </button>
          </form>
        )}

        <Link href="/" className="text-muted hover:text-foreground">
          ← Front page
        </Link>
      </div>
    </main>
  );
}
