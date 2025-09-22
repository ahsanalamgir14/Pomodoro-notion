import React from "react";
import Image from "next/image";

export default function GoogleButton() {
  const handleGoogleSignIn = () => {
    // Google sign-in functionality removed
    console.log("Google sign-in not available");
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      className="mt-3 
    rounded-sm
      bg-gray-400 
       font-semibold text-white shadow-xl cursor-not-allowed opacity-50"
      disabled
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
          Google Sign-in Disabled
        </div>
      </div>
    </button>
  );
}
