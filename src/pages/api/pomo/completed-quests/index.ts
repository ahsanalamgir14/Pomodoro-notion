import { NextApiRequest, NextApiResponse } from "next";
import notionClient from "../../../../utils/apis/notionServerClient";
import { fetchNotionUser } from "../../../../utils/apis/firebase/notionUser";
import { retrieveDatabase } from "../../../../utils/apis/notion/database";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { verifyJWT } from "../../../../utils/serverSide/jwt";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;
    if (method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }

    const { userId, databaseId, adventurePageId, accessToken } = req.query as {
      userId?: string;
      databaseId?: string;
      adventurePageId?: string;
      accessToken?: string;
    };

    if ((!userId && !accessToken) || !databaseId) {
      return res.status(400).json({
        error: "Missing required query params",
        required: ["userId or accessToken", "databaseId"],
      });
    }

    const session = await getServerSession(req as any, res as any, authOptions).catch(() => null);
    const cookieHeader = req.headers.cookie || "";
    const cookies = Object.fromEntries(cookieHeader.split(";").map((c) => { const [k,v] = c.trim().split("="); return [k,v]; }));
    const jwt = cookies["session_token"]; const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "dev-secret";
    const jwtPayload = jwt ? verifyJWT(jwt, secret) : null;
    const legacy = cookies["session_user"] ? decodeURIComponent(cookies["session_user"]) : null;
    const candidates: string[] = [userId, session?.user?.email, (jwtPayload?.email as string) || undefined, legacy, "notion-user"].filter(Boolean) as string[];
    let token: string | null = accessToken || null;
    if (!token) {
      for (const id of candidates) {
        const u = await fetchNotionUser(id!);
        if (u?.accessToken) { token = u.accessToken; break; }
      }
    }
    if (!token) {
      const envToken = process.env.NOTION_TOKEN || null;
      if (!envToken) return res.status(401).json({ error: "User not connected to Notion or token missing" });
      token = envToken;
    }

    // Retrieve database to detect property types
    const db = await retrieveDatabase(databaseId, true, token);
    const dbProps: Record<string, any> = (db as any)?.properties || {};

    const filters: any[] = [];
    // Status filter (Completed)
    if (dbProps["Status"]) {
      if (dbProps["Status"].type === "status") {
        filters.push({ property: "Status", status: { equals: "Completed" } });
      } else if (dbProps["Status"].type === "select") {
        filters.push({ property: "Status", select: { equals: "Completed" } });
      }
    }

    // Adventure relation filter (supports Adventure/Adventures or any relation containing 'adventure')
    if (adventurePageId) {
      const advPropName = dbProps["Adventure"]?.type === "relation"
        ? "Adventure"
        : dbProps["Adventures"]?.type === "relation"
          ? "Adventures"
          : Object.entries(dbProps).find(([k, p]: any) => p?.type === "relation" && /adventure/i.test(k))?.[0];
      if (advPropName) {
        filters.push({ property: advPropName as string, relation: { contains: adventurePageId } });
      }
    }

    const filterPayload = filters.length > 1 ? { and: filters } : filters[0] || undefined;

    const { data } = await notionClient.post(`/v1/databases/${databaseId}/query`, filterPayload ? { filter: filterPayload } : {}, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const results = (data?.results || []) as any[];
    // Extract simple summary: id and title text
    const titlePropName = Object.entries(dbProps).find(([, p]: any) => p?.type === "title")?.[0] || "Name";
    const items = results.map((page: any) => {
      const title = page.properties?.[titlePropName]?.title?.[0]?.plain_text || page.id;
      return { id: page.id, title };
    });

    return res.status(200).json({ count: items.length, items });
  } catch (error: any) {
    console.error("Completed quests API error:", error?.message || error);
    return res.status(500).json({ error: "Failed to query completed quests", details: error?.message || String(error) });
  }
}
