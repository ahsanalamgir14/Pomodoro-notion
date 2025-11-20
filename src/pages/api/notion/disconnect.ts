import { NextApiRequest, NextApiResponse } from "next";
import { verifyJWT } from "../../../utils/serverSide/jwt";
import { disconnectNotionUser } from "../../../utils/apis/firebase/mockUserNotion";

function getSessionEmail(req: NextApiRequest): string | null {
  const cookieHeader = req.headers.cookie || "";
  const cookies = Object.fromEntries(cookieHeader.split(";").map((c) => {
    const [k, v] = c.trim().split("=");
    return [k, v];
  }));
  const token = cookies["session_token"];
  if (token) {
    const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "dev-secret";
    const payload = verifyJWT(token, secret);
    if (payload?.email) return String(payload.email);
  }
  return cookies["session_user"] ? decodeURIComponent(cookies["session_user"]) : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
    const email = getSessionEmail(req);
    if (!email) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const ok = await disconnectNotionUser(email);
    return res.status(200).json({ success: ok });
  } catch (e: any) {
    return res.status(500).json({ error: "Failed to disconnect Notion", details: e?.message || String(e) });
  }
}