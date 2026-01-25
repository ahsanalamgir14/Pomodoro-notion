import React, { useState } from "react";
import Link from "next/link";
import Head from "next/head";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to send reset email");
      }
      setSuccess("If an account exists with this email, you will receive a password reset link shortly.");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center p-4">
      <Head>
        <title>Forgot Password • Pomodoro for Notion</title>
      </Head>

      <h2 className="mt-4 text-3xl font-extrabold leading-normal text-gray-700">
        <Link href="/">
          <a>
            Pomodoro <span className="text-purple-300">for</span> Notion Database
          </a>
        </Link>
      </h2>

      <div className="mt-8 w-full max-w-md rounded-xl bg-white p-6 shadow-md">
        <h3 className="text-center text-2xl font-bold text-gray-900">Forgot Password</h3>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>

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

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="relative block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          <Link href="/login">
            <a className="font-medium text-indigo-600 hover:text-indigo-500">
              Back to Sign In
            </a>
          </Link>
        </div>
      </div>
    </main>
  );
}
