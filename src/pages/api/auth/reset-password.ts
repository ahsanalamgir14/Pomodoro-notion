import { NextApiRequest, NextApiResponse } from "next";
import { verifyJWT } from "../../../utils/serverSide/jwt";
import { updateUserPassword } from "../../../utils/serverSide/usersStore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { token, password } = req.body;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Token is required" });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "dev-secret";
    const payload = verifyJWT(token, secret);

    if (!payload || payload.purpose !== "reset-password") {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const { email } = payload;
    if (!email) {
      return res.status(400).json({ error: "Invalid token payload" });
    }

    updateUserPassword(email, password);

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error: any) {
    console.error("Reset password error:", error);
    if (error.message === "User not found") {
      return res.status(400).json({ error: "User account not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
