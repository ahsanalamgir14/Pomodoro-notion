import { NextApiRequest, NextApiResponse } from "next";
import { Client } from "@notionhq/client";
import { fetchNotionUser } from "../../../../utils/apis/firebase/mockUserNotion";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { userId, databaseId } = req.query as { userId?: string; databaseId?: string };
    if (!userId || !databaseId) {
      return res.status(400).json({
        error: "Missing required query params",
        required: ["userId", "databaseId"],
      });
    }

    const userData = await fetchNotionUser(userId);
    if (!userData || !userData.accessToken) {
      return res.status(401).json({
        error: "User is not connected to Notion or token missing.",
      });
    }

    const notion = new Client({ auth: userData.accessToken });
    const db = await notion.databases.retrieve({ database_id: databaseId });

    const properties: Record<string, any> = (db as any)?.properties || {};
    const propTypes = Object.fromEntries(
      Object.entries(properties).map(([name, prop]: any) => [name, prop?.type])
    );
    const titlePropName = Object.entries(properties).find(([, p]: any) => p?.type === "title")?.[0] || null;

    return res.status(200).json({
      databaseId,
      titlePropName,
      propertyTypes: propTypes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: "Failed to retrieve database properties", details: message });
  }
}