/* eslint-disable react/no-unescaped-entities */
import React from "react";
import { useAuth } from "../utils/Context/AuthContext/Context";
import Footer from "../Components/Footer";
import About from "../Components/About";
import LoginForm from "../Components/LoginForm";

export default function Login() {
  const { user, logout } = useAuth();

  return (
    <>
      {user ? (
        <>
          {" "}
          <div className="flex h-screen flex-col items-center justify-center ">
            Signed in as {user.email} <br />
            <button
              onClick={() => logout()}
              className="mt-3 block
          rounded-lg bg-gray-800 px-6 py-3
          text-lg font-semibold text-white shadow-xl hover:bg-black hover:text-white"
            >
              Sign out
            </button>
            <section className="mt-10">
              <Footer />
            </section>
          </div>{" "}
        </>
      ) : (
        <>
          <LoginForm />
          <div className="mt-10">
            <About />
          </div>
        </>
      )}
    </>
  );
}