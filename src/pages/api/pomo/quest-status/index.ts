import { NextApiRequest, NextApiResponse } from "next";
import { Client } from "@notionhq/client";
import { fetchNotionUser } from "../../../../utils/apis/firebase/notionUser";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { verifyJWT } from "../../../../utils/serverSide/jwt";

// Generic endpoint to update Quest/Adventure status on pause/resume/completion
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;
    if (method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }

    const { userId, questPageId, adventurePageId, status, targetDatabaseId } = req.body as {
      userId?: string;
      questPageId?: string;
      adventurePageId?: string;
      status?: string; // e.g., "Paused" | "In Progress" | "Completed"
      targetDatabaseId?: string; // Optional time tracker database to sync linked entries
    };

    if (!userId || (!questPageId && !adventurePageId) || !status) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["userId", "status", "questPageId | adventurePageId"],
      });
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

    // Helper to update a page's status/select and optionally end date when completed
    const updateStatus = async (pageId: string) => {
      const page = await notion.pages.retrieve({ page_id: pageId });
      const props: Record<string, any> = (page as any)?.properties || {};

      const statusPropName = Object.entries(props).find(([, p]: any) => p?.type === "status" || p?.type === "select")?.[0];
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
      // When marking Completed, set end timestamp if available
      if (status.toLowerCase() === "completed" && endDatePropName) {
        update[endDatePropName] = { date: { start: new Date().toISOString() } };
      }

      if (Object.keys(update).length > 0) {
        await notion.pages.update({ page_id: pageId, properties: update });
      }
    };

    if (questPageId) await updateStatus(questPageId);
    if (adventurePageId && adventurePageId !== questPageId) await updateStatus(adventurePageId);

    // If adventure provided, propagate status to all related quests in its Quests/Quest relation
    if (adventurePageId) {
      try {
        const advPage = await notion.pages.retrieve({ page_id: adventurePageId });
        const advProps: Record<string, any> = (advPage as any)?.properties || {};

        const questsRelProp = advProps["Quests"]?.type === "relation"
          ? "Quests"
          : advProps["Quest"]?.type === "relation"
            ? "Quest"
            : Object.entries(advProps).find(([k, p]: any) => k.toLowerCase().includes("quest") && p?.type === "relation")?.[0];

        if (questsRelProp) {
          const questRelations: any[] = (advProps[questsRelProp] as any)?.relation || [];
          const questIds = questRelations.map((r) => r?.id).filter(Boolean);
          for (const qid of questIds) {
            try {
              const qPage = await notion.pages.retrieve({ page_id: qid });
              const qProps: Record<string, any> = (qPage as any)?.properties || {};

              const qStatusProp = Object.entries(qProps).find(([, p]: any) => p?.type === "status" || p?.type === "select")?.[0];
              const qEndDateProp =
                qProps["End Time"]?.type === "date"
                  ? "End Time"
                  : qProps["End Date"]?.type === "date"
                  ? "End Date"
                  : Object.entries(qProps).find(([k, p]: any) => (k.toLowerCase().includes("end") || k.toLowerCase().includes("finish")) && p?.type === "date")?.[0];

              const update: any = {};
              if (qStatusProp) {
                const t = qProps[qStatusProp].type;
                update[qStatusProp] = t === "status" ? { status: { name: status } } : { select: { name: status } };
              }
              if (status.toLowerCase() === "completed" && qEndDateProp) {
                update[qEndDateProp] = { date: { start: new Date().toISOString() } };
              }

              if (Object.keys(update).length > 0) {
                await notion.pages.update({ page_id: qid, properties: update });
              }
            } catch (e) {
              console.warn("Failed to update quest status for:", qid, e);
            }
          }
        }
      } catch (e) {
        console.warn("Failed to propagate status to adventure's quests:", e);
      }
    }

    // Additionally, if a target time tracker database is provided, update linked entries
    if (targetDatabaseId && questPageId) {
      try {
        const db = await notion.databases.retrieve({ database_id: targetDatabaseId });
        const dbProps: Record<string, any> = (db as any)?.properties || {};

        // Detect relation and status properties in the tracker DB
        const relationPropName = dbProps["Quest"]?.type === "relation"
          ? "Quest"
          : dbProps["Quests"]?.type === "relation"
            ? "Quests"
            : Object.entries(dbProps).find(([k, p]: any) => k.toLowerCase().includes("quest") && p?.type === "relation")?.[0];

        const trackerStatusPropName = dbProps["Status"]?.type
          ? "Status"
          : Object.entries(dbProps).find(([, p]: any) => p?.type === "status" || p?.type === "select")?.[0];

        if (relationPropName) {
          // Build filter to find tracker entries linked to this quest
          const filter: any = {
            and: [
              { property: relationPropName, relation: { contains: questPageId } },
            ],
          };
          // Narrow to active entries if transitioning to Paused or Completed
          if (trackerStatusPropName && (status.toLowerCase() === "paused" || status.toLowerCase() === "completed")) {
            const propType = (dbProps[trackerStatusPropName] as any)?.type;
            const statusFilterKey = propType === "status" ? "status" : "select";
            filter.and.push({ property: trackerStatusPropName, [statusFilterKey]: { equals: "In Progress" } });
          }

          const queryRes = await notion.databases.query({ database_id: targetDatabaseId, filter });

          for (const page of queryRes.results as any[]) {
            const props: Record<string, any> = page?.properties || {};
            const statusPropName = trackerStatusPropName || Object.entries(props).find(([, p]: any) => p?.type === "status" || p?.type === "select")?.[0];
            const endDatePropName =
              props["End Time"]?.type === "date"
                ? "End Time"
                : props["End Date"]?.type === "date"
                  ? "End Date"
                  : Object.entries(props).find(([k, p]: any) => (k.toLowerCase().includes("end") || k.toLowerCase().includes("finish")) && p?.type === "date")?.[0];
            const startDatePropName =
              props["Start Time"]?.type === "date"
                ? "Start Time"
                : props["Start Date"]?.type === "date"
                  ? "Start Date"
                  : Object.entries(props).find(([k, p]: any) => (k.toLowerCase().includes("start") || k.toLowerCase().includes("begin")) && p?.type === "date")?.[0];

            const update: any = {};
            if (statusPropName) {
              const t = props[statusPropName].type;
              update[statusPropName] = t === "status" ? { status: { name: status } } : { select: { name: status } };
            }
            if (status.toLowerCase() === "completed" && endDatePropName) {
              update[endDatePropName] = { date: { start: new Date().toISOString() } };
            }
            if (status.toLowerCase() === "in progress" && startDatePropName) {
              update[startDatePropName] = { date: { start: new Date().toISOString() } };
            }

            if (Object.keys(update).length > 0) {
              await notion.pages.update({ page_id: page.id, properties: update });
            }
          }
        }
      } catch (e) {
        console.warn("Failed to update linked tracker entries:", e);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Quest status API error:", error?.message || error);
    return res.status(500).json({ error: "Failed to update status", details: error?.message || String(error) });
  }
}