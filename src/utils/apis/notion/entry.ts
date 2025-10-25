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
}: CreateNotionEntryParams) => {
  try {
    const notion = getNotionClient(accessToken);
    // Convert duration using start/end when available; fallback to timer value
    const durationSeconds = endTime ? Math.max(0, endTime - startTime) : timerValue;
    const timerMinutes = Math.round(durationSeconds / 60);

    // Format start and end times
    const startDate = new Date(startTime * 1000);
    const endDate = endTime ? new Date(endTime * 1000) : new Date();

    // Retrieve database schema to align property types
    const db = await notion.databases.retrieve({ database_id: databaseId });
    const dbProps: Record<string, any> = (db as any)?.properties || {};
    // Determine core property names and types dynamically for a Time Tracker database
    // Title
    let titlePropName = "Name";
    try {
      for (const [key, prop] of Object.entries(dbProps)) {
        if ((prop as any)?.type === "title") {
          titlePropName = key;
          break;
        }
      }
    } catch (_) { }

    // Status (status or select)
    const statusPropName = dbProps["Status"]?.type ? "Status" : Object.entries(dbProps).find(([, p]: any) => p?.type === "status" || p?.type === "select")?.[0];

    // Start/End date
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

    // Fallback: single generic date property (e.g., "Date")
    const genericDatePropName = !startPropName && !endPropName
      ? Object.entries(dbProps).find(([, p]: any) => p?.type === "date")?.[0]
      : undefined;

    // Duration (prefer number; fallback to rich_text)
    const durationPropName = dbProps["Duration"]?.type
      ? "Duration"
      : dbProps["Duration (minutes)"]?.type
        ? "Duration (minutes)"
        : dbProps["Time Worked"]?.type
          ? "Time Worked"
          : Object.entries(dbProps).find(([k, p]: any) => (k.toLowerCase().includes("duration") || k.toLowerCase().includes("time")) && (p?.type === "number" || p?.type === "rich_text"))?.[0];

    // Quest relation (link entry to quest if DB supports it)
    let questRelationPropName = dbProps["Quest"]?.type === "relation"
      ? "Quest"
      : dbProps["Quests"]?.type === "relation"
        ? "Quests"
        : Object.entries(dbProps).find(([k, p]: any) => (k.toLowerCase().includes("quest")) && p?.type === "relation")?.[0];

    // Prefer relation whose linked database matches sourceDatabaseId
    if (projectId && sourceDatabaseId) {
      try {
        const relMatch = Object.entries(dbProps).find(([, p]: any) => p?.type === "relation" && p?.relation?.database_id === sourceDatabaseId);
        if (relMatch) questRelationPropName = relMatch[0] as string;
      } catch (_) { }
    }

    // Prepare properties for the Notion page (aligned to Time Tracker schema)
    const properties: any = {};

    // Title
    properties[titlePropName] = {
      title: [
        {
          text: {
            content: `${projectTitle} Session`,
          },
        },
      ],
    };

    // Status
    if (statusPropName) {
      const defaultStatus = status || "Completed";
      const propType = dbProps[statusPropName]?.type;
      // Try to resolve to an existing option if needed
      const options = (propType === "status"
        ? (dbProps[statusPropName]?.status?.options || [])
        : (dbProps[statusPropName]?.select?.options || [])) as Array<{ name: string }>;
      const resolvedStatus = options?.some(o => o?.name === defaultStatus)
        ? defaultStatus
        : (options?.find(o => /done|complete|completed|finished/i.test(o?.name))?.name || options?.[0]?.name || defaultStatus);

      if (propType === "status") {
        properties[statusPropName] = { status: { name: resolvedStatus } };
      } else if (propType === "select") {
        properties[statusPropName] = { select: { name: resolvedStatus } };
      }
    }

    // Start
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

    // End (only set when endTime provided)
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

    // Single generic Date property handling
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

    // Duration (only set when endTime provided)
    if (durationPropName && endTime) {
      const propType = dbProps[durationPropName]?.type;
      if (propType === "number") {
        properties[durationPropName] = { number: timerMinutes };
      } else if (propType === "rich_text") {
        properties[durationPropName] = {
          rich_text: [
            { text: { content: `${timerMinutes} min` } }
          ],
        };
      }
    }

    // Link to Quest via relation if present
    if (questRelationPropName && projectId) {
      properties[questRelationPropName] = { relation: [{ id: projectId }] };
    }

    // Also try linking "Project" relation if present
    const projectRelationPropName = Object.entries(dbProps).find(([k, p]: any) => p?.type === "relation" && (k.toLowerCase().includes("project") || (sourceDatabaseId && p?.relation?.database_id === sourceDatabaseId)))?.[0];
    if (projectRelationPropName && projectId) {
      properties[projectRelationPropName] = { relation: [{ id: projectId }] };
    }

    // Quests/Project as text (rich_text) if the database provides it
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
      properties[questsTextPropName] = {
        rich_text: [
          { text: { content: projectTitle } }
        ],
      };
    }

    // Optional summary in Notes if exists
    if (dbProps["Notes"]?.type === "rich_text") {
      properties["Notes"] = {
        rich_text: [
          {
            text: {
              content: `Session: ${timerMinutes} min | Start: ${startDate.toLocaleString()} | End: ${endDate.toLocaleString()}`,
            },
          },
        ],
      };
    }

    // Tags handling: multi_select/select/rich_text
    if (tags && tags.length > 0) {
      const tagsPropName = dbProps["Tags"]?.type
        ? "Tags"
        : Object.entries(dbProps).find(([, p]: any) => p?.type === "multi_select" || p?.type === "select" || p?.type === "rich_text")?.[0];
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

    // Create or update the page in Notion
    // Try to upsert an existing tracker entry for this quest/project
    let targetPageId: string | null = null;
    try {
      // Prefer relation-based match
      if (questRelationPropName && projectId) {
        const propType = (dbProps[questRelationPropName] as any)?.type;
        if (propType === "relation") {
          const queryRes = await notion.databases.query({
            database_id: databaseId,
            filter: {
              property: questRelationPropName,
              relation: { contains: projectId },
            },
          });
          if ((queryRes?.results || []).length > 0) {
            targetPageId = (queryRes.results[0] as any)?.id || null;
          }
        }
      }

      // If not found via relation, try rich_text property for quest/project name
      if (!targetPageId) {
        const questsTextPropName = dbProps["Quest Name"]?.type === "rich_text"
          ? "Quest Name"
          : dbProps["Project Name"]?.type === "rich_text"
            ? "Project Name"
            : dbProps["Project"]?.type === "rich_text"
              ? "Project"
              : dbProps["Quest"]?.type === "rich_text"
                ? "Quest"
                : undefined;
        if (questsTextPropName && projectTitle) {
          const queryRes = await notion.databases.query({
            database_id: databaseId,
            filter: {
              property: questsTextPropName,
              rich_text: { contains: projectTitle },
            },
            sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
          });
          if ((queryRes?.results || []).length > 0) {
            targetPageId = (queryRes.results[0] as any)?.id || null;
          }
        }
      }

      // If still not found, try title contains projectTitle
      if (!targetPageId && titlePropName && projectTitle) {
        const queryRes = await notion.databases.query({
          database_id: databaseId,
          filter: {
            property: titlePropName,
            title: { contains: projectTitle },
          },
          sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
        });
        if ((queryRes?.results || []).length > 0) {
          targetPageId = (queryRes.results[0] as any)?.id || null;
        }
      }
    } catch (e) {
      // Non-blocking: if query fails, we'll create a new page below
      if (process.env.NODE_ENV !== "production") {
        console.warn("Upsert lookup failed, will create new page:", e);
      }
    }

    if (targetPageId) {
      // Update the existing page with all properties
      const response = await notion.pages.update({
        page_id: targetPageId,
        properties,
      });
      return response.id;
    } else {
      // Create a new page
      const response = await notion.pages.create({
        parent: {
          database_id: databaseId,
        },
        properties,
      });
      return response.id;
    }
    return response.id;
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