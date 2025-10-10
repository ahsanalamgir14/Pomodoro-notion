import { NextApiRequest, NextApiResponse } from "next";
import notionClient from "../../../../utils/apis/notionServerClient";
import { fetchNotionUser } from "../../../../utils/apis/firebase/mockUserNotion";
import { retrieveDatabase } from "../../../../utils/apis/notion/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;
    if (method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }

    const { userId, databaseId, adventurePageId } = req.query as {
      userId?: string;
      databaseId?: string;
      adventurePageId?: string;
    };

    if (!userId || !databaseId) {
      return res.status(400).json({
        error: "Missing required query params",
        required: ["userId", "databaseId"],
      });
    }

    const userData = await fetchNotionUser(userId);
    if (!userData?.accessToken) {
      return res.status(401).json({ error: "User not connected to Notion or token missing" });
    }

    // Retrieve database to detect property types
    const db = await retrieveDatabase(databaseId, true, userData.accessToken);
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

    // Adventure relation filter
    if (adventurePageId && dbProps["Adventure"]) {
      if (dbProps["Adventure"].type === "relation") {
        filters.push({ property: "Adventure", relation: { contains: adventurePageId } });
      }
    }

    const filterPayload = filters.length > 1 ? { and: filters } : filters[0] || undefined;

    const { data } = await notionClient.post(`/v1/databases/${databaseId}/query`, filterPayload ? { filter: filterPayload } : {}, {
      headers: { Authorization: `Bearer ${userData.accessToken}` },
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