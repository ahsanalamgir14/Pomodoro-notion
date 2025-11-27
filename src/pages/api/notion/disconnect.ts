import { NextApiRequest, NextApiResponse } from "next";
import { verifyJWT } from "../../../utils/serverSide/jwt";
import { disconnectNotionUser } from "../../../utils/apis/firebase/notionUser";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

async function resolveEmail(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  const session = await getServerSession(req as any, res as any, authOptions).catch(() => null);
  const sessionEmail = session?.user?.email || null;
  const cookieHeader = req.headers.cookie || "";
  const cookies = Object.fromEntries(cookieHeader.split(";").map((c) => { const [k, v] = c.trim().split("="); return [k, v]; }));
  const jwt = cookies["session_token"]; const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "dev-secret";
  const jwtPayload = jwt ? verifyJWT(jwt, secret) : null;
  const legacy = cookies["session_user"] ? decodeURIComponent(cookies["session_user"]) : null;
  const bodyUserId = (req.body && (req.body.userId as string)) || null;
  const candidates = [bodyUserId, sessionEmail, (jwtPayload?.email as string) || null, legacy]
    .filter(Boolean)
    .filter((e) => e !== "notion-user") as string[];
  return candidates[0] || null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
    const email = await resolveEmail(req, res);
    if (!email) {
      return res.status(401).json({ error: "Not authenticated or userId missing" });
    }
    const ok = await disconnectNotionUser(email);
    return res.status(200).json({ success: ok });
  } catch (e: any) {
    return res.status(500).json({ error: "Failed to disconnect Notion", details: e?.message || String(e) });
  }
}
