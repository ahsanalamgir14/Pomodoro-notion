import { NextApiRequest, NextApiResponse } from "next";
import { Client } from "@notionhq/client";
import { fetchNotionUser } from "../../../../utils/apis/firebase/mockUserNotion";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;
    if (method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }

    const { userId, questPageId, targetDatabaseId, projectTitle, adventurePageId } = req.body as {
      userId?: string;
      questPageId?: string;
      targetDatabaseId?: string;
      projectTitle?: string;
      adventurePageId?: string;
    };

    if (!userId || !questPageId) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["userId", "questPageId"],
      });
    }

    const userData = await fetchNotionUser(userId);
    if (!userData?.accessToken) {
      return res.status(401).json({ error: "User not connected to Notion or token missing" });
    }

    const notion = new Client({ auth: userData.accessToken });

    // Retrieve the page to inspect available properties
    const page = await notion.pages.retrieve({ page_id: questPageId });
    const pageProps: Record<string, any> = (page as any)?.properties || {};

    // Determine a status property we can update
    const statusPropName = Object.entries(pageProps).find(([, p]: any) => p?.type === "status" || p?.type === "select")?.[0];

    // Determine a start date property we can set
    const startDatePropName =
      Object.entries(pageProps).find(([, p]: any) => p?.type === "date" && /start|begin|started/i.test((p as any)?.name || ""))?.[0]
      || (pageProps["Start Date"]?.type === "date" ? "Start Date" : undefined)
      || (pageProps["Start Time"]?.type === "date" ? "Start Time" : undefined)
      || (pageProps["Started At"]?.type === "date" ? "Started At" : undefined);

    const properties: Record<string, any> = {};

    if (statusPropName) {
      const statusType = pageProps[statusPropName].type;
      if (statusType === "status") {
        properties[statusPropName] = { status: { name: "In Progress" } };
      } else if (statusType === "select") {
        properties[statusPropName] = { select: { name: "In Progress" } };
      }
    }

    if (startDatePropName) {
      properties[startDatePropName] = { date: { start: new Date().toISOString() } };
    }

    if (Object.keys(properties).length === 0) {
      return res.status(200).json({ message: "No updatable status/date properties found on quest page", success: true });
    }

    await notion.pages.update({ page_id: questPageId, properties });

    // If an adventure page is provided, establish the relation in the adventure table
    if (adventurePageId) {
      const advPage = await notion.pages.retrieve({ page_id: adventurePageId });
      const advProps: Record<string, any> = (advPage as any)?.properties || {};

      // Also update Adventure status to In Progress if it has a status/select
      const advStatusProp = Object.entries(advProps).find(([, p]: any) => p?.type === "status" || p?.type === "select")?.[0];
      if (advStatusProp) {
        const t = advProps[advStatusProp].type;
        await notion.pages.update({
          page_id: adventurePageId,
          properties: t === "status" ? { [advStatusProp]: { status: { name: "In Progress" } } } : { [advStatusProp]: { select: { name: "In Progress" } } },
        });
      }

      // Find relation prop on Adventure that points to Quests
      const advQuestRelationProp = advProps["Quests"]?.type === "relation"
        ? "Quests"
        : advProps["Quest"]?.type === "relation"
          ? "Quest"
          : Object.entries(advProps).find(([k, p]: any) => k.toLowerCase().includes("quest") && p?.type === "relation")?.[0];

      if (advQuestRelationProp) {
        // Preserve existing relations and append the quest
        const existing = (advProps[advQuestRelationProp] as any)?.relation || [];
        const existingIds = new Set<string>(existing.map((r: any) => r?.id).filter(Boolean));
        existingIds.add(questPageId);
        const newRelations = Array.from(existingIds).map((id) => ({ id }));

        await notion.pages.update({
          page_id: adventurePageId,
          properties: { [advQuestRelationProp]: { relation: newRelations } },
        });

        // Sync status for all related quests under this Adventure
        const relatedQuestIds = newRelations.map((r) => r.id);
        for (const qid of relatedQuestIds) {
          try {
            const qPage = await notion.pages.retrieve({ page_id: qid });
            const qProps: Record<string, any> = (qPage as any)?.properties || {};
            const qStatusProp = Object.entries(qProps).find(([, p]: any) => p?.type === "status" || p?.type === "select")?.[0];
            const qStartDateProp =
              Object.entries(qProps).find(([, p]: any) => p?.type === "date" && /start|begin|started/i.test((p as any)?.name || ""))?.[0]
              || (qProps["Start Date"]?.type === "date" ? "Start Date" : undefined)
              || (qProps["Start Time"]?.type === "date" ? "Start Time" : undefined)
              || (qProps["Started At"]?.type === "date" ? "Started At" : undefined);

            const qUpdate: any = {};
            if (qStatusProp) {
              const qt = qProps[qStatusProp].type;
              qUpdate[qStatusProp] = qt === "status" ? { status: { name: "In Progress" } } : { select: { name: "In Progress" } };
            }
            if (qStartDateProp) {
              qUpdate[qStartDateProp] = { date: { start: new Date().toISOString() } };
            }
            if (Object.keys(qUpdate).length > 0) {
              await notion.pages.update({ page_id: qid, properties: qUpdate });
            }
          } catch (e) {
            // Non-blocking: continue syncing other quests
            console.warn("Failed to sync quest status:", qid, e);
          }
        }
      }

      // Also, if the quest page has a relation back to Adventure, set it
      const questProps: Record<string, any> = pageProps;
      const questAdvRelationProp = questProps["Adventure"]?.type === "relation"
        ? "Adventure"
        : questProps["Adventures"]?.type === "relation"
          ? "Adventures"
          : Object.entries(questProps).find(([k, p]: any) => k.toLowerCase().includes("adventure") && p?.type === "relation")?.[0];

      if (questAdvRelationProp) {
        const existingQ = (questProps[questAdvRelationProp] as any)?.relation || [];
        const existingQIds = new Set<string>(existingQ.map((r: any) => r?.id).filter(Boolean));
        existingQIds.add(adventurePageId);
        const newQRelations = Array.from(existingQIds).map((id) => ({ id }));

        await notion.pages.update({
          page_id: questPageId,
          properties: { [questAdvRelationProp]: { relation: newQRelations } },
        });
      }
    }

    // Optionally, create a real-time entry in the selected time tracker database linking back to the quest
    let trackerEntryId: string | undefined;
    if (targetDatabaseId) {
      const db = await notion.databases.retrieve({ database_id: targetDatabaseId });
      const dbProps: Record<string, any> = (db as any)?.properties || {};

      // Resolve properties in the time tracker DB
      const titlePropName = Object.entries(dbProps).find(([, p]: any) => p?.type === "title")?.[0] || "Name";
      const trackerStatusProp = dbProps["Status"]?.type ? "Status" : Object.entries(dbProps).find(([, p]: any) => p?.type === "status" || p?.type === "select")?.[0];
      const startProp = dbProps["Start Time"]?.type === "date"
        ? "Start Time"
        : dbProps["Start Date"]?.type === "date"
          ? "Start Date"
          : Object.entries(dbProps).find(([k, p]: any) => (k.toLowerCase().includes("start") || k.toLowerCase().includes("begin")) && p?.type === "date")?.[0];
      const questRelationProp = dbProps["Quest"]?.type === "relation"
        ? "Quest"
        : dbProps["Quests"]?.type === "relation"
          ? "Quests"
          : Object.entries(dbProps).find(([k, p]: any) => k.toLowerCase().includes("quest") && p?.type === "relation")?.[0];

      const trackerProps: any = {};
      // Title
      trackerProps[titlePropName] = { title: [{ text: { content: `${projectTitle || "Work"} Session` } }] };
      // Status
      if (trackerStatusProp) {
        const t = dbProps[trackerStatusProp].type;
        trackerProps[trackerStatusProp] = t === "status" ? { status: { name: "In Progress" } } : { select: { name: "In Progress" } };
      }
      // Start
      if (startProp) {
        trackerProps[startProp] = { date: { start: new Date().toISOString() } };
      }
      // Relation to Quest
      if (questRelationProp) {
        trackerProps[questRelationProp] = { relation: [{ id: questPageId }] };
      }

      const created = await notion.pages.create({
        parent: { database_id: targetDatabaseId },
        properties: trackerProps,
      });
      trackerEntryId = (created as any)?.id;
    }

    return res.status(200).json({ message: "Quest marked as started", success: true, trackerEntryId });
  } catch (error: any) {
    console.error("Quest start API error:", error?.message || error);
    return res.status(500).json({ error: "Failed to mark quest as started", details: error?.message || String(error) });
  }
}