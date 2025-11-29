import { NextApiRequest, NextApiResponse } from "next";
import { Client } from "@notionhq/client";
import { fetchNotionUser } from "../../../../utils/apis/firebase/notionUser";

// Lists top Notion pages for the connected account using Notion search
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { userId, query: q } = req.query as { userId?: string; query?: string };
    if (!userId) {
      return res.status(400).json({ error: "Missing required query params", required: ["userId"] });
    }

    const userData = await fetchNotionUser(userId);
    if (!userData?.accessToken) {
      return res.status(401).json({ error: "User not connected to Notion or token missing" });
    }

    const notion = new Client({ auth: userData.accessToken });

    // Use Notion search to list pages
    const searchResp = await notion.search({
      query: q || undefined,
      filter: { value: "page", property: "object" },
      sort: { direction: "descending", timestamp: "last_edited_time" },
    });

    const pages = (searchResp?.results || [])
      .filter((r: any) => r?.object === "page")
      .slice(0, 50);

    // Attempt to derive a human-readable title
    const items = pages.map((p: any) => {
      // Some pages may not expose title directly; try several fallbacks
      const titleFromProperties = p?.properties?.title?.title?.[0]?.plain_text;
      const titleFromIcon = p?.icon?.emoji ? `Page ${p.icon.emoji}` : undefined;
      const fallbackFromUrl = (p?.url || "").split("/").pop()?.replace(/-/g, " ");
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
    return res.status(500).json({ error: "Failed to list Notion pages", details: error?.message || String(error) });
  }
}
