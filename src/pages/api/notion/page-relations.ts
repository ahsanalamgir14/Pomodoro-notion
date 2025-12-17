import { NextApiRequest, NextApiResponse } from "next";
import { Client } from "@notionhq/client";
import { fetchNotionUser } from "../../../utils/apis/firebase/notionUser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { userId, pageId, relationName, accessToken } = req.query as { userId?: string; pageId?: string; relationName?: string; accessToken?: string };
    if (!userId || !pageId) {
      return res.status(400).json({ error: "Missing required query params", required: ["userId", "pageId"] });
    }

    let token = accessToken;
    if (!token) {
      const userData = await fetchNotionUser(userId);
      token = userData?.accessToken;
    }

    if (!token) {
      return res.status(401).json({ error: "User not connected to Notion or token missing" });
    }

    const notion = new Client({ auth: token });

    // Retrieve page with properties
    const page: any = await notion.pages.retrieve({ page_id: pageId });
    const properties: Record<string, any> = page?.properties || {};

    // Find relation property - default to 'Quests' unless overridden by relationName
    const targetRelName = relationName || "Quests";
    const relPropEntry = Object.entries(properties).find(([k, p]: any) => k === targetRelName && p?.type === "relation")
      || Object.entries(properties).find(([k, p]: any) => /quest|quests/i.test(k) && p?.type === "relation");

    if (!relPropEntry) {
      return res.status(200).json({ relationName: targetRelName, items: [] });
    }

    const [propName, relProp] = relPropEntry as [string, any];
    const relatedIds: string[] = (relProp?.relation || []).map((r: any) => r?.id).filter(Boolean);

    if (relatedIds.length === 0) {
      return res.status(200).json({ relationName: propName, items: [] });
    }

    // Fetch related page titles
    const items: Array<{ id: string; title: string }> = [];
    for (const rid of relatedIds) {
      try {
        const rp: any = await notion.pages.retrieve({ page_id: rid });
        // Try finding title property
        const rpProps: Record<string, any> = rp?.properties || {};
        const titlePropName = Object.entries(rpProps).find(([, p]: any) => p?.type === "title")?.[0];
        const title = titlePropName ? (rpProps as any)[titlePropName]?.title?.[0]?.plain_text : undefined;
        items.push({ id: rid, title: title || rp?.id });
      } catch {
        items.push({ id: rid, title: rid });
      }
    }

    return res.status(200).json({ relationName: propName, items });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to fetch page relations", details: error?.message || String(error) });
  }
}
