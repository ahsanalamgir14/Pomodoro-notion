import { db } from "@/utils/firebaseutils";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import FirestoreAdapter from "../../../Adapters/Firestore";
import { validatePassword, getUser, normalizeEmail } from "../../../utils/serverSide/usersStore";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = normalizeEmail(String(credentials?.email || ""));
        const password = String(credentials?.password || "");
        if (!email || !password) return null;
        const ok = validatePassword(email, password);
        if (!ok) return null;
        const u = getUser(email);
        return u ? { id: u.email, name: u.email.split("@")[0], email: u.email } : null;
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  adapter: FirestoreAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
};

export default NextAuth(authOptions);
