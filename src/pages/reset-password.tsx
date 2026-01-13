import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to reset password");
      }
      setSuccess("Password reset successfully. You can now sign in.");
      setPassword("");
      setConfirm("");
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!router.isReady) return null;

  if (!token) {
    return (
      <main className="container mx-auto flex min-h-screen flex-col items-center p-4">
        <div className="mt-20 text-center">
          <h2 className="text-xl font-bold text-red-600">Invalid Link</h2>
          <p className="mt-2 text-gray-600">This password reset link is invalid or missing a token.</p>
          <Link href="/forgot-password">
            <a className="mt-4 inline-block text-indigo-600 hover:text-indigo-500">Request a new link</a>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center p-4">
      <Head>
        <title>Reset Password • Pomodoro for Notion</title>
      </Head>

      <h2 className="mt-4 text-3xl font-extrabold leading-normal text-gray-700">
        <Link href="/">
          <a>
            Pomodoro <span className="text-purple-300">for</span> Notion Database
          </a>
        </Link>
      </h2>

      <div className="mt-8 w-full max-w-md rounded-xl bg-white p-6 shadow-md">
        <h3 className="text-center text-2xl font-bold text-gray-900">Reset Password</h3>

        {success && (
          <div className="mt-4 rounded-md bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!success && (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="password" className="sr-only">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="confirm" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Confirm Password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="relative block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
