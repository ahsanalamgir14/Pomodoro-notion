import type { NextApiRequest, NextApiResponse } from "next";

function getSessionEmail(req: NextApiRequest): string | null {
  const cookieHeader = req.headers.cookie || "";
  const cookies = Object.fromEntries(cookieHeader.split(";").map((c) => {
    const [k, v] = c.trim().split("=");
    return [k, v];
  }));
  return cookies["session_user"] ? decodeURIComponent(cookies["session_user"]) : null;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const email = getSessionEmail(req);
  if (!email) {
    return res.status(200).json({ isAuthenticated: false });
  }
  return res.status(200).json({ isAuthenticated: true, email });
}
