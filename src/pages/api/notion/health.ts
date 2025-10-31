import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const clientId = process.env.NEXT_PUBLIC_NOTION_AUTH_CLIENT_ID;
    const clientSecret = process.env.NOTION_CLIENT_SECRET;
    const redirectUriEnv = process.env.NEXT_PUBLIC_NOTION_AUTH_REDIRECT_URI;

    // Default to site origin if available, otherwise env must be present
    const fallbackOrigin = (req.headers["x-forwarded-proto"] && req.headers["x-forwarded-host"]) 
      ? `${req.headers["x-forwarded-proto"]}://${req.headers["x-forwarded-host"]}` 
      : undefined;

    const redirectUri = redirectUriEnv || (fallbackOrigin ? `${fallbackOrigin}/api/notion/oauth` : undefined);

    const stateParam = "notion-user";
    const authorizeUrl = clientId && redirectUri
      ? `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(stateParam)}`
      : undefined;

    const diagnostics = {
      platform: process.env.NETLIFY ? "netlify" : process.env.VERCEL ? "vercel" : "unknown",
      nodeEnv: process.env.NODE_ENV,
      env: {
        clientIdPresent: Boolean(clientId),
        clientSecretPresent: Boolean(clientSecret),
        redirectUri,
      },
      checks: {
        hasHttpsRedirect: redirectUri ? redirectUri.startsWith("https://") : false,
        pathCorrect: redirectUri ? redirectUri.endsWith("/api/notion/oauth") : false,
        matchesNetlify: redirectUri === "https://pomodoro-notion.netlify.app/api/notion/oauth",
      },
      authorizeUrl,
    };

    return res.status(200).json({ ok: true, diagnostics });
  } catch (error) {
    console.error("Notion health error:", error);
    return res.status(500).json({ ok: false, error: "Health check failed" });
  }
}
