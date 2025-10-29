import type { NextApiRequest, NextApiResponse } from "next";
import { createUser, normalizeEmail } from "../../../utils/serverSide/usersStore";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { email, password } = req.body as { email?: string; password?: string };
    const e = normalizeEmail(email || "");
    const p = (password || "").trim();
    if (!e || !p || p.length < 6) {
      return res.status(400).json({ error: "Invalid email or password (min 6 chars)" });
    }

    try {
      createUser(e, p);
    } catch (err: any) {
      return res.status(409).json({ error: "User already exists" });
    }

    const secureFlag = process.env.NODE_ENV === "production" ? "Secure; " : "";
    res.setHeader(
      "Set-Cookie",
      `session_user=${encodeURIComponent(e)}; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
    );

    return res.status(200).json({ success: true, email: e });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Signup failed" });
  }
}
