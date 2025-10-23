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
    } catch (_) {}

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
      } catch (_) {}
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
      if (propType === "status") {
        properties[statusPropName] = { status: { name: defaultStatus } };
      } else if (propType === "select") {
        properties[statusPropName] = { select: { name: defaultStatus } };
      }
    }

    // Start
    if (startPropName) {
      properties[startPropName] = { date: { start: startDate.toISOString(), ...(endTime && !endPropName ? { end: endDate.toISOString() } : {}) } };
    }

    // End (only set when endTime provided)
    if (endPropName && endTime) {
      properties[endPropName] = { date: { start: endDate.toISOString() } };
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

    // Quests as text (rich_text) if the database provides it
    const questsTextPropName = dbProps["Quests"]?.type === "rich_text"
      ? "Quests"
      : dbProps["Quest"]?.type === "rich_text"
        ? "Quest"
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

    // Create the page in Notion
    const response = await notion.pages.create({
      parent: {
        database_id: databaseId
      },
      properties
    });

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