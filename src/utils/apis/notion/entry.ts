import { Client } from "@notionhq/client";

// Create a Notion client using either a provided access token (OAuth)
// or fall back to the environment integration token.
const getNotionClient = (accessToken?: string) =>
  new Client({
    auth: accessToken || process.env.NOTION_TOKEN,
  });

export interface CreateNotionEntryParams {
  databaseId: string;
  sourceDatabaseId?: string; // quest source database to match relation
  projectId: string;
  projectTitle: string;
  timerValue: number; // in seconds
  startTime: number; // timestamp
  endTime?: number; // timestamp
  status?: string; // e.g., "Completed"
  notes?: string; // optional notes content
  tags?: string[]; // optional tags
  accessToken?: string; // optional OAuth token to use for this request
  questPageId?: string; // optional explicit quest page to relate
  questPageIds?: string[]; // optional multiple quest pages to relate
}

export const createNotionEntry = async ({
  databaseId,
  sourceDatabaseId,
  projectId,
  projectTitle,
  timerValue,
  startTime,
  endTime,
  status,
  notes,
  tags,
  accessToken,
  questPageId,
  questPageIds,
}: CreateNotionEntryParams) => {
  try {
    const notion = getNotionClient(accessToken);
    const durationSeconds = endTime ? Math.max(0, endTime - startTime) : timerValue;
    const timerMinutes = Math.round(durationSeconds / 60);
    const startDate = new Date(startTime * 1000);
    const endDate = endTime ? new Date(endTime * 1000) : new Date();

    const db = await notion.databases.retrieve({ database_id: databaseId });
    const dbProps: Record<string, any> = (db as any)?.properties || {};

    let titlePropName = "Name";
    try {
      for (const [key, prop] of Object.entries(dbProps)) {
        if ((prop as any)?.type === "title") {
          titlePropName = key;
          break;
        }
      }
    } catch (_) { }

    const statusPropName = dbProps["Status"]?.type ? "Status" : Object.entries(dbProps).find(([, p]: any) => p?.type === "status" || p?.type === "select")?.[0];

    const startPropName = dbProps["Start Time"]?.type === "date"
      ? "Start Time"
      : dbProps["Start Date"]?.type === "date"
        ? "Start Date"
        : Object.entries(dbProps).find(([k, p]: any) => (k.toLowerCase().includes("start") || k.toLowerCase().includes("begin")) && p?.type === "date")?.[0];

    const endPropName = dbProps["End Time"]?.type === "date"
      ? "End Time"
      : dbProps["End Date"]?.type === "date"
        ? "End Date"
        : dbProps["Due Date"]?.type === "date"
          ? "Due Date"
          : Object.entries(dbProps).find(([k, p]: any) => (k.toLowerCase().includes("end") || k.toLowerCase().includes("finish") || k.toLowerCase().includes("due")) && p?.type === "date")?.[0];

    const genericDatePropName = !startPropName && !endPropName
      ? Object.entries(dbProps).find(([, p]: any) => p?.type === "date")?.[0]
      : undefined;




    const properties: any = {};

    const startTextPropName = dbProps["Start Time (text)"]?.type === "rich_text"
      ? "Start Time (text)"
      : Object.entries(dbProps).find(([k, p]: any) => /start\s*time/i.test(k) && p?.type === "rich_text")?.[0];
    const endTextPropName = dbProps["End Time (text)"]?.type === "rich_text"
      ? "End Time (text)"
      : Object.entries(dbProps).find(([k, p]: any) => /end\s*time|finish/i.test(k) && p?.type === "rich_text")?.[0];

    properties[titlePropName] = {
      title: [
        { text: { content: `${projectTitle} Session` } },
      ],
    };

    properties["Status"] = { status: { name: status || "Completed" } };

    if (startPropName) {
      const startType = dbProps[startPropName]?.type;
      if (startType === "date") {
        properties[startPropName] = { date: { start: startDate.toISOString(), ...(endTime && !endPropName ? { end: endDate.toISOString() } : {}) } };
      } else if (startType === "rich_text") {
        properties[startPropName] = { rich_text: [{ text: { content: startDate.toLocaleString() } }] };
      } else if (startType === "number") {
        properties[startPropName] = { number: startTime };
      }
    }

    if (endPropName && endTime) {
      const endType = dbProps[endPropName]?.type;
      if (endType === "date") {
        properties[endPropName] = { date: { start: endDate.toISOString() } };
      } else if (endType === "rich_text") {
        properties[endPropName] = { rich_text: [{ text: { content: endDate.toLocaleString() } }] };
      } else if (endType === "number") {
        properties[endPropName] = { number: endTime };
      }
    }

    if (!startPropName && !endPropName && genericDatePropName) {
      const t = dbProps[genericDatePropName]?.type;
      if (t === "date") {
        properties[genericDatePropName] = {
          date: {
            start: startDate.toISOString(),
            ...(endTime ? { end: endDate.toISOString() } : {}),
          },
        };
      }
    }

    if (!startPropName && startTextPropName) {
      properties[startTextPropName] = { rich_text: [{ type: "text", text: { content: startDate.toLocaleString() } }] };
    }
    if (!endPropName && endTime && endTextPropName) {
      properties[endTextPropName] = { rich_text: [{ type: "text", text: { content: endDate.toLocaleString() } }] };
    }

    const durationText = `${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, "0")}`;
    properties["Duration"] = { rich_text: [{ type: "text", text: { content: durationText } }] };

    // Determine quest ids for text derivation
    let rawRelationIds = (questPageIds && questPageIds.length > 0)
      ? questPageIds
      : (questPageId ? [questPageId] : []);

    // If no explicit quest ids provided, try to pull quests from the selected project page's own relation
    // This mirrors the UI expectation: the project's associated Quests should be written to the tracker entry.
    if (rawRelationIds.length === 0 && projectId) {
      try {
        const projPage: any = await notion.pages.retrieve({ page_id: projectId });
        const projProps: Record<string, any> = projPage?.properties || {};
        // Try to find a relation property named like Quests/Quest on the project page
        const entry = Object.entries(projProps).find(([k, p]: any) => p?.type === "relation" && /quest|quests/i.test(k))
          || Object.entries(projProps).find(([, p]: any) => p?.type === "relation");
        const relItems: Array<{ id: string }> = entry ? (((entry[1] as any)?.relation) || []) : [];
        const ids = relItems.map(r => r?.id).filter(Boolean) as string[];
        if (ids.length > 0) {
          rawRelationIds = ids;
        }
      } catch (_) { /* ignore */ }
    }



    // Do NOT set "Quest Name" relation with projectId; only quest ids should populate quest relations

    const projectRelationPropName = Object.entries(dbProps).find(([k, p]: any) => p?.type === "relation" && (k.toLowerCase().includes("project") || (sourceDatabaseId && p?.relation?.database_id === sourceDatabaseId)))?.[0];
    if (projectRelationPropName) {
      const projectRelationIds = (rawRelationIds.length > 0) ? rawRelationIds : (projectId ? [projectId] : []);
      if (projectRelationIds.length > 0) {
        properties[projectRelationPropName] = { relation: projectRelationIds.map(id => ({ id })) };
      }
    }

    let questsTextContent = "";
    try {
      const idsForText = rawRelationIds.length > 0 ? rawRelationIds : [];
      if (idsForText.length > 0) {
        const titles = await Promise.all(idsForText.map(async (id) => {
          try {
            const q = await notion.pages.retrieve({ page_id: id });
            const props: any = (q as any)?.properties || {};
            const titleKey = Object.entries(props).find(([, p]: any) => p?.type === "title")?.[0];
            const titleArr = titleKey ? (props[titleKey]?.title || []) : [];
            const text = (titleArr[0]?.plain_text) || (titleArr[0]?.text?.content) || "";
            return text.trim();
          } catch (_) { return ""; }
        }));
        const names = titles.filter(Boolean);
        if (names.length > 0) {
          questsTextContent = names.join(", ");
        }
      }
    } catch (_) { }

    properties["Quests"] = { rich_text: [{ type: "text", text: { content: questsTextContent || projectTitle } }] };

    if (dbProps["Notes"]?.type === "rich_text") {
      properties["Notes"] = {
        rich_text: [
          { type: "text", text: { content: `Session: ${timerMinutes} min | Start: ${startDate.toLocaleString()} | End: ${endDate.toLocaleString()}` } },
        ],
      };
    }

    if (tags && tags.length > 0) {
      let tagsPropName: string | undefined = undefined;
      if (dbProps["Tags"]?.type) {
        tagsPropName = "Tags";
      } else {
        const preferredName = Object.entries(dbProps).find(([k, p]: any) => (
          (p?.type === "multi_select" || p?.type === "select" || p?.type === "rich_text") && (/tag|tags|label|labels|category|categories/i.test(k))
        ))?.[0] as string | undefined;
        tagsPropName = preferredName;
      }

      if (tagsPropName) {
        const t = dbProps[tagsPropName]?.type;
        if (t === "multi_select") {
          properties[tagsPropName] = { multi_select: tags.map(name => ({ name })) };
        } else if (t === "select") {
          properties[tagsPropName] = { select: { name: tags[0] } };
        } else if (t === "rich_text") {
          properties[tagsPropName] = { rich_text: [{ type: "text", text: { content: tags.join(", ") } }] };
        }
      }
    }

    if (tags && tags.length > 0 && dbProps["Tags"]?.type === "multi_select") {
      properties["Tags"] = { multi_select: tags.map(name => ({ name })) };
    }

    let targetPageId: string | null = null;
    try {

      if (!targetPageId) {
        const questsTextPropName2 = dbProps["Quest Name"]?.type === "rich_text"
          ? "Quest Name"
          : dbProps["Project Name"]?.type === "rich_text"
            ? "Project Name"
            : dbProps["Project"]?.type === "rich_text"
              ? "Project"
              : dbProps["Quest"]?.type === "rich_text"
                ? "Quest"
                : undefined;
        if (questsTextPropName2 && projectTitle) {
          const queryRes = await notion.databases.query({
            database_id: databaseId,
            filter: { property: questsTextPropName2, rich_text: { contains: projectTitle } },
            sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
          });
          if ((queryRes?.results || []).length > 0) {
            targetPageId = (queryRes.results[0] as any)?.id || null;
          }
        }
      }

      if (!targetPageId && titlePropName && projectTitle) {
        const queryRes = await notion.databases.query({
          database_id: databaseId,
          filter: { property: titlePropName, title: { contains: projectTitle } },
          sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
        });
        if ((queryRes?.results || []).length > 0) {
          targetPageId = (queryRes.results[0] as any)?.id || null;
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Upsert lookup failed, will create new page:", e);
      }
    }

    if (targetPageId) {
      const response = await notion.pages.update({ page_id: targetPageId, properties });
      return response.id;
    } else {
      const response = await notion.pages.create({ parent: { database_id: databaseId }, properties });
      return response.id;
    }
  } catch (error) {
    console.error("Error creating Notion entry:", error);
    throw new Error(`Failed to create Notion entry: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

// Function to get database properties to understand the schema
export const getDatabaseProperties = async (databaseId: string) => {
  try {
    const notion = getNotionClient();
    const database = await notion.databases.retrieve({
      database_id: databaseId
    });

    return database.properties;
  } catch (error) {
    console.error("Error retrieving database properties:", error);
    throw new Error(`Failed to retrieve database properties: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};
