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

    const durationPropName = dbProps["Duration"]?.type
      ? "Duration"
      : dbProps["Duration (minutes)"]?.type
        ? "Duration (minutes)"
        : dbProps["Time Worked"]?.type
          ? "Time Worked"
          : Object.entries(dbProps).find(([k, p]: any) => (k.toLowerCase().includes("duration") || k.toLowerCase().includes("time")) && (p?.type === "number" || p?.type === "rich_text"))?.[0];

    let questRelationPropName = dbProps["Quest"]?.type === "relation"
      ? "Quest"
      : dbProps["Quests"]?.type === "relation"
        ? "Quests"
        : dbProps["Quest Name"]?.type === "relation"
          ? "Quest Name"
          : Object.entries(dbProps).find(([k, p]: any) => (k.toLowerCase().includes("quest") || k.toLowerCase().includes("project")) && p?.type === "relation")?.[0];

    if (projectId && sourceDatabaseId) {
      try {
        const relMatch = Object.entries(dbProps).find(([, p]: any) => p?.type === "relation" && p?.relation?.database_id === sourceDatabaseId);
        if (relMatch) questRelationPropName = relMatch[0] as string;
      } catch (_) { }
    }

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

    if (statusPropName) {
      const defaultStatus = status || "Completed";
      const propType = dbProps[statusPropName]?.type;
      const statusConfig = dbProps[statusPropName]?.status;
      const options = (propType === "status"
        ? (statusConfig?.options || [])
        : (dbProps[statusPropName]?.select?.options || [])) as Array<{ name: string; id?: string; color?: string; group_id?: string }>;

      let resolvedStatus: string | undefined = undefined;
      resolvedStatus = options?.some(o => o?.name === defaultStatus) ? defaultStatus : undefined;
      if (!resolvedStatus && propType === "status") {
        const groups: Array<{ id: string; name: string }> = statusConfig?.groups || [];
        const completeGroupId = groups.find(g => /done|complete|completed|finished/i.test(g?.name || ""))?.id;
        if (completeGroupId) {
          const optionInComplete = options.find(o => o.group_id === completeGroupId)?.name;
          if (optionInComplete) resolvedStatus = optionInComplete;
        }
      }
      if (!resolvedStatus) {
        resolvedStatus = options?.find(o => /done|complete|completed|finished/i.test(o?.name || ""))?.name;
      }
      if (!resolvedStatus) {
        resolvedStatus = options?.find(o => /in\s*progress|active|ongoing/i.test(o?.name || ""))?.name || options?.[0]?.name || defaultStatus;
      }

      if (propType === "status") {
        properties[statusPropName] = { status: { name: resolvedStatus } };
      } else if (propType === "select") {
        properties[statusPropName] = { select: { name: resolvedStatus } };
      }

      // Force explicit mapping when property exactly named "Status"
      if (dbProps["Status"]?.type === "status") {
        properties["Status"] = { status: { name: resolvedStatus } };
      }
    }

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
      properties[startTextPropName] = { rich_text: [{ text: { content: startDate.toLocaleString() } }] };
    }
    if (!endPropName && endTime && endTextPropName) {
      properties[endTextPropName] = { rich_text: [{ text: { content: endDate.toLocaleString() } }] };
    }

    // Duration: explicitly map numeric minutes
    if (durationPropName) {
      const propType = dbProps[durationPropName]?.type;
      if (propType === "number") {
        properties[durationPropName] = { number: timerMinutes };
      } else if (propType === "rich_text") {
        properties[durationPropName] = { rich_text: [{ text: { content: String(timerMinutes) } }] };
      }
    }
    if (dbProps["Duration (minutes)"]?.type === "number") {
      properties["Duration (minutes)"] = { number: timerMinutes };
    }
    if (dbProps["Duration"]?.type === "number") {
      properties["Duration"] = { number: timerMinutes };
    }

    // Determine relation target ids
    const rawRelationIds = (questPageIds && questPageIds.length > 0)
      ? questPageIds
      : (questPageId ? [questPageId] : (projectId ? [projectId] : []));

    // Filter relation ids to match relation's database_id when available
    let filteredRelationIds = rawRelationIds;
    try {
      if (questRelationPropName && rawRelationIds.length > 0) {
        const expectedDbId: string | undefined = dbProps[questRelationPropName]?.relation?.database_id;
        if (expectedDbId) {
          const checks = await Promise.all(rawRelationIds.map(async (id) => {
            try {
              const page = await notion.pages.retrieve({ page_id: id });
              const parent = (page as any)?.parent;
              const parentDbId = parent?.type === "database_id" ? parent?.database_id : undefined;
              return parentDbId === expectedDbId ? id : null;
            } catch (_) {
              return null;
            }
          }));
          filteredRelationIds = checks.filter(Boolean) as string[];
        }
      }
    } catch (_) { }

    if (questRelationPropName && filteredRelationIds.length > 0) {
      properties[questRelationPropName] = { relation: filteredRelationIds.map(id => ({ id })) };
    }

    if (rawRelationIds.length > 0 && dbProps["Quests"]?.type === "relation") {
      properties["Quests"] = { relation: rawRelationIds.map(id => ({ id })) };
    }

    if (projectId && dbProps["Quest Name"]?.type === "relation") {
      properties["Quest Name"] = { relation: [{ id: projectId }] };
    }

    const projectRelationPropName = Object.entries(dbProps).find(([k, p]: any) => p?.type === "relation" && (k.toLowerCase().includes("project") || (sourceDatabaseId && p?.relation?.database_id === sourceDatabaseId)))?.[0];
    if (projectRelationPropName && rawRelationIds.length > 0) {
      properties[projectRelationPropName] = { relation: rawRelationIds.map(id => ({ id })) };
    }

    const questsTextPropName = dbProps["Quest Name"]?.type === "rich_text"
      ? "Quest Name"
      : dbProps["Quest"]?.type === "rich_text"
        ? "Quest"
        : dbProps["Quests"]?.type === "rich_text"
          ? "Quests"
          : dbProps["Project Name"]?.type === "rich_text"
            ? "Project Name"
            : dbProps["Project"]?.type === "rich_text"
              ? "Project"
              : undefined;

    if (questsTextPropName) {
      properties[questsTextPropName] = { rich_text: [{ text: { content: projectTitle } }] };
    }

    if (dbProps["Notes"]?.type === "rich_text") {
      properties["Notes"] = {
        rich_text: [
          { text: { content: `Session: ${timerMinutes} min | Start: ${startDate.toLocaleString()} | End: ${endDate.toLocaleString()}` } },
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
          properties[tagsPropName] = { rich_text: [{ text: { content: tags.join(", ") } }] };
        }
      }
    }

    if (tags && tags.length > 0 && dbProps["Tags"]?.type === "multi_select") {
      properties["Tags"] = { multi_select: tags.map(name => ({ name })) };
    }

    let targetPageId: string | null = null;
    try {
      if (questRelationPropName && projectId) {
        const propType = (dbProps[questRelationPropName] as any)?.type;
        if (propType === "relation") {
          const queryRes = await notion.databases.query({
            database_id: databaseId,
            filter: { property: questRelationPropName, relation: { contains: projectId } },
          });
          if ((queryRes?.results || []).length > 0) {
            targetPageId = (queryRes.results[0] as any)?.id || null;
          }
        }
      }

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