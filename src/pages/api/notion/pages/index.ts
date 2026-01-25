import { NextApiRequest, NextApiResponse } from "next";
import { Client } from "@notionhq/client";
import { fetchNotionUser } from "../../../../utils/apis/firebase/notionUser";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { verifyJWT } from "../../../../utils/serverSide/jwt";

// Lists top Notion pages for the connected account using Notion search
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { userId, query: q, accessToken } = req.query as { userId?: string; query?: string; accessToken?: string };

    // Try multiple ways to resolve user identifier (same as other endpoints)
    const session = await getServerSession(req as any, res as any, authOptions).catch(() => null);
    const cookieHeader = req.headers.cookie || "";
    const cookies = Object.fromEntries(cookieHeader.split(";").map((c) => {
      const [k, v] = c.trim().split("=");
      return [k, v];
    }));
    const jwt = cookies["session_token"];
    const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "dev-secret";
    const jwtPayload = jwt ? verifyJWT(jwt, secret) : null;
    const legacy = cookies["session_user"] ? decodeURIComponent(cookies["session_user"]) : null;

    // Build candidate list: userId param, session email, JWT email, legacy cookie, or "notion-user"
    const candidates: string[] = [
      userId || null,
      session?.user?.email || null,
      (jwtPayload?.email as string) || null,
      legacy || null,
      "notion-user"
    ].filter(Boolean) as string[];

    let token: string | null = accessToken || null;

    // Try each candidate until we find a valid token
    if (!token) {
      for (const id of candidates) {
        try {
          const u = await fetchNotionUser(id!);
          if (u?.accessToken) {
            token = u.accessToken;
            break;
          }
        } catch (e) {
          // Continue to next candidate
          continue;
        }
      }
    }

    // Fallback to environment token if available
    if (!token) {
      const envToken = process.env.NOTION_TOKEN || null;
      if (envToken) {
        token = envToken;
      }
    }

    if (!token) {
      return res.status(401).json({ error: "User not connected to Notion or token missing" });
    }

    const notion = new Client({ auth: token });

    // Use Notion search to list pages
    const searchResp = await notion.search({
      query: q || undefined,
      filter: { value: "page", property: "object" },
      sort: { direction: "descending", timestamp: "last_edited_time" },
    });

    // Filter out database items (pages that are children of a database)
    // Also exclude archived pages
    const pages = (searchResp?.results || [])
      .filter((r: any) => {
        const isPage = r?.object === "page";
        // Strictly exclude database items
        const isDatabaseItem = r?.parent?.type === "database_id";
        // Exclude archived items if the property exists (search usually handles this but being safe)
        const isArchived = r?.archived === true;
        
        return isPage && !isDatabaseItem && !isArchived;
      })
      .slice(0, 50);

    // Attempt to derive a human-readable title
    const items = pages.map((p: any) => {
      // Find the property of type "title"
      const titleProp = Object.values(p.properties || {}).find((prop: any) => prop.type === "title");
      const titleFromProperties = (titleProp as any)?.title?.[0]?.plain_text;

      const titleFromIcon = p?.icon?.emoji ? `Page ${p.icon.emoji}` : undefined;
      
      // Fallback: extract from URL and try to remove the ID
      let fallbackFromUrl = undefined;
      if (p?.url) {
        const slug = p.url.split("/").pop() || "";
        // Notion slugs usually end with the 32-char ID. 
        // We split by hyphen. If the last part is a 32-char hex string, we drop it.
        const parts = slug.split("-");
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart.length === 32 && /^[0-9a-fA-F]+$/.test(lastPart)) {
          parts.pop();
        }
        if (parts.length > 0) {
          fallbackFromUrl = parts.join(" ");
        }
      }

      const title = titleFromProperties || titleFromIcon || fallbackFromUrl || "Untitled Page";
      return {
        id: p?.id,
        title,
        url: p?.url,
        lastEditedTime: p?.last_edited_time,
      };
    });

    return res.status(200).json({ count: items.length, items });
  } catch (error: any) {
    console.error("Notion pages API error:", error?.message || error);
    if (error?.message?.includes("token is invalid") || error?.status === 401 || error?.code === "unauthorized") {
       return res.status(401).json({ error: "Invalid Notion token", details: error.message });
    }
    return res.status(500).json({ error: "Failed to list Notion pages", details: error?.message || String(error) });
  }
}
