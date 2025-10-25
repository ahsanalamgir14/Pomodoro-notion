/* eslint-disable react/no-unescaped-entities */
import { useAuth } from "../../utils/Context/AuthContext/Context";
import Link from "next/link";
import React from "react";
import Footer from "../Footer";
import LoginForm from "../LoginForm";

export default function About() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center px-5 pb-5 ">
        <h1 className="my-5 flex flex-col items-center gap-5 text-4xl font-extrabold leading-normal text-gray-700 md:flex-row">
          <Link href="/">
            <a>
              Pomodoro <span className="text-purple-300">for </span> Notion
              Database
            </a>
          </Link>
        </h1>
        
        {!user ? (
          <>
            <p className="text-center text-gray-600 mb-8">
              Sign in to start using the Pomodoro timer with your Notion database
            </p>
            <LoginForm />
          </>
        ) : (
          <p className="text-center text-gray-600">
            Welcome back! You're signed in as {user.email}
          </p>
        )}
        
        <Footer />
      </div>
    </>
  );
}