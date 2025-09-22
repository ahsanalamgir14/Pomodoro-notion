import { AppProps } from "next/app";
import Shield from "../Components/Shield";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from "../utils/Context/AuthContext/Context";
import "../styles/globals.css";
import { trpc } from "../utils/trpc";

const MyApp = ({
  Component,
  pageProps,
}: AppProps) => {
  return (
    <>
      <AuthProvider>
        <Shield>
          <Component {...pageProps} />
        </Shield>
        <Analytics />
      </AuthProvider>
    </>
  );
};

export default trpc.withTRPC(MyApp);