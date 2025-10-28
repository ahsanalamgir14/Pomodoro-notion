import type { NextApiRequest, NextApiResponse } from "next";
import { normalizeEmail, validatePassword } from "../../../utils/serverSide/usersStore";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { email, password } = req.body as { email?: string; password?: string };
    const e = normalizeEmail(email || "");
    const p = (password || "").trim();
    if (!e || !p) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    if (!validatePassword(e, p)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const secureFlag = process.env.NODE_ENV === "production" ? "Secure; " : "";
    res.setHeader(
      "Set-Cookie",
      `session_user=${encodeURIComponent(e)}; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
    );

    return res.status(200).json({ success: true, email: e });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
}
