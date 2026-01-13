/* eslint-disable react/no-unescaped-entities */
import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Footer from "../Components/Footer";
import GoogleButton from "../Components/GoogleButton";
import type { GetServerSidePropsContext } from "next";
import { verifyJWT } from "../utils/serverSide/jwt";

export default function Signup({ disableGoogle = false }: { disableGoogle?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // If already authenticated (session cookie present), auto-redirect
  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      try {
        const res = await fetch('/api/session', { method: 'GET' });
        const json = await res.json().catch(() => ({}));
        if (mounted && json?.isAuthenticated) {
          router.replace('/');
        }
      } catch {}
    };
    checkSession();
    return () => { mounted = false; };
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    const em = email.trim().toLowerCase();
    const pw = password.trim();
    const cf = confirm.trim();
    
    if (!em || !pw) {
      setErrorMsg("Email and password are required.");
      return;
    }
    if (pw.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    if (pw !== cf) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, password: pw }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(json?.error || "Signup failed");
        return;
      }
      setSuccessMsg("Account created. Redirecting...");
      setTimeout(() => router.push("/login"), 800);
    } catch (err) {
      setErrorMsg("Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center p-4">
      <Head>
        <title>Sign Up • Pomodoro for Notion</title>
      </Head>
      
      <h2 className="mt-4 text-3xl font-extrabold leading-normal text-gray-700">
        <Link href="/">
          <a>
            Pomodoro <span className="text-purple-300">for</span> Notion Database
          </a>
        </Link>
      </h2>

      <div className="mt-8 w-full max-w-md rounded-xl bg-white p-6 shadow-md">
        <h3 className="text-center text-2xl font-bold text-gray-900">Sign up</h3>
        <p className="mt-2 text-center text-sm text-gray-600">
          Create your Pomodoro account.
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
              autoComplete="email"
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
              autoComplete="new-password"
              placeholder="Password"
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
              placeholder="Confirm Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="relative block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {errorMsg && <div className="text-center text-sm text-red-600">{errorMsg}</div>}
          {successMsg && <div className="text-center text-sm text-green-600">{successMsg}</div>}

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {loading ? "Signing up…" : "Sign Up"}
          </button>

          <div className="mt-3 text-center text-sm">
            <span className="text-gray-600">Already have an account?</span>{" "}
            <Link href="/login">
              <a className="text-indigo-600 hover:text-indigo-700">Sign in</a>
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
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }
  const disableGoogle = (process.env.NEXT_PUBLIC_DISABLE_FIREBASE === "true") || (process.env.DISABLE_FIREBASE === "true") || (process.env.NEXT_PUBLIC_DISABLE_AUTH === "true");
  return { props: { disableGoogle } };
}
