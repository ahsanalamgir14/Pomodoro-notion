import type { NextApiRequest, NextApiResponse } from "next";
import { verifyJWT } from "../../utils/serverSide/jwt";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";

function parseCookies(header: string) {
  const items = Object.fromEntries((header || "").split(";").map((c) => {
    const [k, v] = c.trim().split("=");
    return [k, v];
  }));
  return items;
}

function getSessionEmail(req: NextApiRequest): string | null {
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies["session_token"];
  if (token) {
    const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "dev-secret";
    const payload = verifyJWT(token, secret);
    if (payload?.email) return payload.email as string;
  }
  const legacy = cookies["session_user"];
  return legacy ? decodeURIComponent(legacy) : null;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const email = getSessionEmail(req);
  if (email) {
    return res.status(200).json({ isAuthenticated: true, email });
  }
  getServerSession(req as any, res as any, authOptions).then((session) => {
    if (session?.user?.email) {
      return res.status(200).json({ isAuthenticated: true, email: session.user.email });
    }
    return res.status(200).json({ isAuthenticated: false });
  }).catch(() => {
    return res.status(200).json({ isAuthenticated: false });
  });
}
