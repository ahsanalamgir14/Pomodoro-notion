import { NextApiRequest, NextApiResponse } from "next";
import { Client } from "@notionhq/client";
import { verifyJWT } from "../../../utils/serverSide/jwt";
import { fetchNotionUser } from "../../../utils/apis/firebase/notionUser";
import { listDatabases } from "../../../utils/apis/notion/database";

function getSessionEmail(req: NextApiRequest): string | null {
  const cookieHeader = req.headers.cookie || "";
  const cookies = Object.fromEntries(cookieHeader.split(";").map((c) => {
    const [k, v] = c.trim().split("=");
    return [k, v];
  }));
  const token = cookies["session_token"];
  if (token) {
    const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "dev-secret";
    const payload = verifyJWT(token, secret);
    if (payload?.email) return String(payload.email);
  }
  return cookies["session_user"] ? decodeURIComponent(cookies["session_user"]) : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const bodyUserId = (req.body && (req.body.userId as string)) || null;
    const email = getSessionEmail(req) || bodyUserId || "notion-user";
    let userData = await fetchNotionUser(email);
    if (!userData?.accessToken && email !== "notion-user") {
      userData = await fetchNotionUser("notion-user");
    }
    const token = userData?.accessToken || process.env.NOTION_TOKEN;
    if (!token) {
      return res.status(401).json({ error: "User not connected to Notion or token missing" });
    }

    const notion = new Client({ auth: token });

    // Create a parent page to hold demo databases
    const demoPage = await notion.pages.create({
      parent: { type: "workspace", workspace: true },
      properties: {
        title: { title: [{ text: { content: "Pomodoro Demo Workspace" } }] },
      },
    });

    // Create Quests database
    const questsDb = await notion.databases.create({
      parent: { type: "page_id", page_id: demoPage.id },
      title: [{ type: "text", text: { content: "Quests" } }],
      properties: {
        Name: { title: {} },
        Status: {
          select: {
            options: [
              { name: "Not started", color: "default" },
              { name: "In progress", color: "blue" },
              { name: "Completed", color: "green" },
            ],
          },
        },
        "Start Date": { date: {} },
        "Due Date": { date: {} },
      },
    } as any);

    // Create Time Tracking database with relation to Quests
    const trackingDb = await notion.databases.create({
      parent: { type: "page_id", page_id: demoPage.id },
      title: [{ type: "text", text: { content: "Time Tracking" } }],
      properties: {
        Name: { title: {} },
        Status: {
          select: {
            options: [
              { name: "In Progress", color: "yellow" },
              { name: "Paused", color: "orange" },
              { name: "Completed", color: "green" },
            ],
          },
        },
        "Start Time": { date: {} },
        "End Time": { date: {} },
        Duration: { number: { format: "number" } },
        Notes: { rich_text: {} },
        Tags: { multi_select: { options: [] } },
        Quests: { relation: { database_id: questsDb.id } },
      },
    } as any);
    console.log("Created Time Tracking database:", JSON.stringify(trackingDb, null, 2));

    // Create Adventure database with relation to Quests
    const adventureDb = await notion.databases.create({
      parent: { type: "page_id", page_id: demoPage.id },
      title: [{ type: "text", text: { content: "Adventure" } }],
      properties: {
        Name: { title: {} },
        Status: {
          select: {
            options: [
              { name: "Not started", color: "default" },
              { name: "In progress", color: "blue" },
              { name: "Completed", color: "green" },
            ],
          },
        },
        Tags: { multi_select: { options: [] } },
        Quests: { relation: { database_id: questsDb.id } },
      },
    } as any);
    console.log("Created Adventure database:", JSON.stringify(adventureDb, null, 2));

    // Return updated database list for caching on client
    const databases = await listDatabases(true, token);
    return res.status(200).json({
      success: true,
      workspace: (userData && userData.workspace) || { workspace_icon: "/icon-192x192.png" },
      databases,
      created: { questsId: questsDb.id, trackingId: trackingDb.id, adventureId: adventureDb.id, pageId: demoPage.id },
    });
  } catch (error: any) {
    console.error("Create demo workspace failed:", error?.message || error);
    return res.status(500).json({ error: "Failed to create demo workspace", details: error?.message || String(error) });
  }
}