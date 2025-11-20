/* eslint-disable react/no-unescaped-entities */
import React, { useEffect, useState } from "react";
import type { GetServerSidePropsContext } from "next";
import { verifyJWT } from "../utils/serverSide/jwt";
import Link from "next/link";
import Footer from "../Components/Footer";
import GoogleButton from "../Components/GoogleButton";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";

export default function Login({ disableGoogle = false }: { disableGoogle?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(null);

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    try {
      const res = await signIn('credentials', { email, password, redirect: false });
      if (res?.error) {
        // Fallback to legacy cookie login
        const legacy = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const json = await legacy.json().catch(() => ({}));
        if (!legacy.ok) {
          setError(res.error || json?.error || 'Login failed');
          return;
        }
      }
      setSuccess('Signed in successfully');
      const redirectTarget = (router.query.redirect as string) || '/';
      router.replace(redirectTarget);
    } catch (err) {
      setError('Login failed');
    }
  };

  // If already authenticated (session cookie present), auto-redirect
  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      try {
        const res = await fetch('/api/session', { method: 'GET' });
        const json = await res.json().catch(() => ({}));
        if (mounted && json?.isAuthenticated) {
          const redirectTarget = (router.query.redirect as string) || '/';
          router.replace(redirectTarget);
        }
      } catch {}
    };
    // Only run when router is ready to read query params
    if (router.isReady) {
      checkSession();
    }
    return () => { mounted = false; };
  }, [router.isReady, router.query.redirect, router]);

  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center p-4">
      <h2 className="mt-4 text-3xl font-extrabold leading-normal text-gray-700">
        <Link href="/">
          <a>
            Pomodoro <span className="text-purple-300">for</span> Notion Database
          </a>
        </Link>
      </h2>

      <div className="mt-8 w-full max-w-md rounded-xl bg-white p-6 shadow-md">
        <h3 className="text-center text-2xl font-bold text-gray-900">Sign in</h3>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in with your email and password to continue.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="relative block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="relative block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                className="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me
            </label>
            <Link href="#">
              <a className="text-sm text-indigo-600 hover:text-indigo-700">Forgot password?</a>
            </Link>
          </div>

          {error && <div className="text-center text-sm text-red-600">{error}</div>}
          {success && <div className="text-center text-sm text-green-600">{success}</div>}

          <button
            type="submit"
            className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Sign in
          </button>

          <div className="mt-3 text-center text-sm">
            <span className="text-gray-600">Don't have an account?</span>{" "}
            <Link href="/signup">
              <a className="text-indigo-600 hover:text-indigo-700">Sign up</a>
            </Link>
          </div>
        </form>

        {!disableGoogle && (
          <div className="mt-4">
            <GoogleButton />
          </div>
        )}
      </div>

      <section className="mt-10 w-full max-w-md">
        <Footer />
      </section>
    </main>
  );
}

// Server-side: if a valid session exists, redirect before rendering
export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const cookieHeader = ctx.req.headers.cookie || "";
  const cookies = Object.fromEntries(cookieHeader.split(";").map((c) => {
    const [k, v] = c.trim().split("=");
    return [k, v];
  }));
  const token = cookies["session_token"];
  const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "dev-secret";
  const payload = token ? verifyJWT(token, secret) : null;
  const sessionUser = payload?.email || (cookies["session_user"] ? decodeURIComponent(cookies["session_user"]) : null);
  if (sessionUser) {
    const redirect = (ctx.query?.redirect as string) || "/";
    return {
      redirect: {
        destination: redirect,
        permanent: false,
      },
    };
  }
  const disableGoogle = (process.env.NEXT_PUBLIC_DISABLE_FIREBASE === "true") || (process.env.DISABLE_FIREBASE === "true") || (process.env.NEXT_PUBLIC_DISABLE_AUTH === "true");
  return { props: { disableGoogle } };
}
