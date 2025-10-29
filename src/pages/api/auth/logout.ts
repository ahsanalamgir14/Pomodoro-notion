import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const secureFlag = process.env.NODE_ENV === "production" ? "Secure; " : "";
    res.setHeader(
      "Set-Cookie",
      `session_user=; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=0`
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Logout failed" });
  }
}
