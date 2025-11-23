import { NextApiRequest, NextApiResponse } from "next";
import { Client } from "@notionhq/client";
import { fetchNotionUser } from "../../../../utils/apis/firebase/notionUser";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { verifyJWT } from "../../../../utils/serverSide/jwt";

// Updates a Notion task page's status (and start/end date when applicable)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { userId, pageId, status } = req.body as { userId?: string; pageId?: string; status?: string };
    if (!userId || !pageId || !status) {
      return res.status(400).json({ error: "Missing required fields", required: ["userId", "pageId", "status"] });
    }

    const session = await getServerSession(req as any, res as any, authOptions).catch(() => null);
    const cookieHeader = req.headers.cookie || "";
    const cookies = Object.fromEntries(cookieHeader.split(";").map((c) => { const [k,v] = c.trim().split("="); return [k,v]; }));
    const jwt = cookies["session_token"]; const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "dev-secret";
    const jwtPayload = jwt ? verifyJWT(jwt, secret) : null;
    const candidates: string[] = [userId, session?.user?.email, jwtPayload?.email as string, cookies["session_user"] ? decodeURIComponent(cookies["session_user"]) : undefined, "notion-user"].filter(Boolean) as string[];
    let token: string | null = null;
    for (const id of candidates) {
      const u = await fetchNotionUser(id!);
      if (u?.accessToken) { token = u.accessToken; break; }
    }
    if (!token) {
      const envToken = process.env.NOTION_TOKEN || null;
      if (!envToken) return res.status(401).json({ error: "User not connected to Notion or token missing" });
      token = envToken;
    }

    const notion = new Client({ auth: token });

    const page: any = await notion.pages.retrieve({ page_id: pageId });
    const props: Record<string, any> = page?.properties || {};

    // Find a status/select property to update on the task page
    const statusPropName = Object.entries(props).find(([, p]: any) => p?.type === "status" || p?.type === "select")?.[0];

    // Common start/end date property names or heuristics
    const startDatePropName =
      props["Start Time"]?.type === "date"
        ? "Start Time"
        : props["Start Date"]?.type === "date"
          ? "Start Date"
          : Object.entries(props).find(([k, p]: any) => (k.toLowerCase().includes("start") || k.toLowerCase().includes("begin")) && p?.type === "date")?.[0];
    const endDatePropName =
      props["End Time"]?.type === "date"
        ? "End Time"
        : props["End Date"]?.type === "date"
          ? "End Date"
          : Object.entries(props).find(([k, p]: any) => (k.toLowerCase().includes("end") || k.toLowerCase().includes("finish")) && p?.type === "date")?.[0];

    const update: any = {};
    if (statusPropName) {
      const t = props[statusPropName].type;
      update[statusPropName] = t === "status" ? { status: { name: status } } : { select: { name: status } };
    }

    const s = (status || "").toLowerCase();
    if (s === "in progress" && startDatePropName) {
      update[startDatePropName] = { date: { start: new Date().toISOString() } };
    }
    if (s === "completed" && endDatePropName) {
      update[endDatePropName] = { date: { start: new Date().toISOString() } };
    }

    if (Object.keys(update).length === 0) {
      return res.status(200).json({ message: "No updatable properties found on task page", success: true });
    }

    await notion.pages.update({ page_id: pageId, properties: update });
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Task status API error", error?.message || error);
    return res.status(500).json({ error: "Failed to update task status", details: error?.message || String(error) });
  }
}

