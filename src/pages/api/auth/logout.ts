import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    // Only add Secure on HTTPS; localhost over HTTP should not use Secure
    const forwardedProto = (req.headers["x-forwarded-proto"] as string) || "";
    const host = req.headers.host || "";
    const isLocal = host.includes("localhost") || host.startsWith("127.0.0.1");
    const isHttps = forwardedProto === "https";
    const secureFlag = isHttps && !isLocal ? "Secure; " : "";
    res.setHeader("Set-Cookie", [
      `session_token=; Path=/; HttpOnly; ${secureFlag}SameSite=Strict; Max-Age=0`,
      `session_user=; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=0`,
    ]);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Logout failed" });
  }
}
