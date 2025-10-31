import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", ["GET", "HEAD"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  return res.status(200).json({
    ok: true,
    method: req.method,
    ts: new Date().toISOString(),
    runtime: process.env.NODE_ENV,
    platform: process.env.NETLIFY ? "netlify" : process.env.VERCEL ? "vercel" : "unknown",
  });
}
