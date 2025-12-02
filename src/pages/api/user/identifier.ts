import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { verifyJWT } from "../../../utils/serverSide/jwt";
import { fetchNotionUser } from "../../../utils/apis/firebase/notionUser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const session = await getServerSession(req as any, res as any, authOptions).catch(() => null);
    const cookieHeader = req.headers.cookie || "";
    const cookies = Object.fromEntries(cookieHeader.split(";").map((c) => { const [k, v] = c.trim().split("="); return [k, v]; }));
    const jwt = cookies["session_token"]; const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "dev-secret";
    const jwtPayload = jwt ? verifyJWT(jwt, secret) : null;
    const legacy = cookies["session_user"] ? decodeURIComponent(cookies["session_user"]) : null;

    const candidates = [session?.user?.email || null, (jwtPayload?.email as string) || null, legacy].filter(Boolean) as string[];
    const resolvedUserId = candidates[0] || "";

    let hasToken = false;
    let email = resolvedUserId || "";
    if (email) {
      const u = await fetchNotionUser(email).catch(() => null);
      hasToken = !!(u && u.accessToken);
    }

    const isAuthenticated = !!(session?.user?.email || jwtPayload?.email || legacy);
    return res.status(200).json({ resolvedUserId, email, hasToken, isAuthenticated });
  } catch (error) {
    return res.status(500).json({ error: "Failed to resolve user identifier" });
  }
}
