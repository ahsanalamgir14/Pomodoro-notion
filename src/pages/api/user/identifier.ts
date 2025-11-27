import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { verifyJWT } from "../../../utils/serverSide/jwt";
import { fetchNotionUser } from "../../../utils/apis/firebase/notionUser";

function parseCookies(header: string) {
  return Object.fromEntries((header || "").split(";").map((c) => {
    const [k, v] = c.trim().split("=");
    return [k, v];
  }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const cookies = parseCookies(req.headers.cookie || "");
    const token = cookies["session_token"] || "";
    const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "dev-secret";
    const jwtPayload = token ? verifyJWT(token, secret) : null;
    const legacy = cookies["session_user"] ? decodeURIComponent(cookies["session_user"]) : null;
    const session = await getServerSession(req as any, res as any, authOptions).catch(() => null);
    const sessionEmail = session?.user?.email || null;
    const jwtEmail = (jwtPayload?.email as string) || null;

    const candidates = [sessionEmail, legacy, jwtEmail]
      .filter(Boolean)
      .filter((id) => id !== "notion-user") as string[];
    let resolvedUserId: string | null = null;
    let hasToken = false;
    for (const id of candidates) {
      const u = await fetchNotionUser(id);
      if (u?.accessToken) {
        resolvedUserId = id;
        hasToken = true;
        break;
      }
    }
    return res.status(200).json({
      email: sessionEmail || jwtEmail || (legacy && legacy !== "notion-user" ? legacy : null) || null,
      resolvedUserId: resolvedUserId || sessionEmail || jwtEmail || (legacy && legacy !== "notion-user" ? legacy : null) || null,
      hasToken,
    });
  } catch {
    return res.status(200).json({ email: null, resolvedUserId: null, hasToken: false });
  }
}
