import React from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";

export default function GoogleButton() {
  const handleGoogleSignIn = () => {
    signIn("google");
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      className="mt-3 rounded-sm bg-indigo-600 font-semibold text-white shadow-xl hover:bg-indigo-700"
    >
      <div className="flex items-center ">
        <div className="m-[1px] flex items-center justify-center rounded-sm bg-slate-50 p-[10px]">
          <Image
            className=""
            alt="googleImage"
            width={20}
            height={20}
            src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
          />
        </div>
        <div className="flex items-center self-stretch   px-3 text-sm text-white">
          Sign in with Google
        </div>
      </div>
    </button>
  );
}
