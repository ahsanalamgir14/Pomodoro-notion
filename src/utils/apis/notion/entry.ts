import { Client } from "@notionhq/client";

// Create a Notion client using either a provided access token (OAuth)
// or fall back to the environment integration token.
const getNotionClient = (accessToken?: string) =>
  new Client({
    auth: accessToken || process.env.NOTION_TOKEN,
  });

export interface CreateNotionEntryParams {
  databaseId: string;
  projectId: string;
  projectTitle: string;
  timerValue: number; // in seconds
  startTime: number; // timestamp
  endTime?: number; // timestamp
  status?: string; // e.g., "Completed"
  notes?: string; // optional notes content
  accessToken?: string; // optional OAuth token to use for this request
}

export const createNotionEntry = async ({
  databaseId,
  projectId,
  projectTitle,
  timerValue,
  startTime,
  endTime,
  status,
  notes,
  accessToken,
}: CreateNotionEntryParams) => {
  try {
    const notion = getNotionClient(accessToken);
    // Convert timer value to minutes for better readability
    const timerMinutes = Math.round(timerValue / 60);
    
    // Format start and end times
    const startDate = new Date(startTime * 1000);
    const endDate = endTime ? new Date(endTime * 1000) : new Date();

    // Retrieve database schema to align property types
    const db = await notion.databases.retrieve({ database_id: databaseId });
    const dbProps: Record<string, any> = (db as any)?.properties || {};
    // Determine the title property name (fallback to "Name")
    let titlePropName = "Name";
    try {
      for (const [key, prop] of Object.entries(dbProps)) {
        if ((prop as any)?.type === "title") {
          titlePropName = key;
          break;
        }
      }
    } catch (_) {
      // If properties are not enumerable, keep default 'Name'
    }
    // If title property is not detectable, proceed with default 'Name'.
    // Notion will return a clear error if the property does not exist.
    
    // Prepare properties for the Notion page (aligned to Quests schema)
    const properties: any = {};

    // Name — title (using detected title property)
    properties[titlePropName] = {
      title: [
        {
          text: {
            content: `${projectTitle} Session`,
          },
        },
      ],
    };

    // Adventure — prefer relation; fallback to rich_text
    if (dbProps["Adventure"]) {
      if (dbProps["Adventure"].type === "relation" && projectId) {
        properties["Adventure"] = {
          relation: [{ id: projectId }],
        };
      } else {
        properties["Adventure"] = {
          rich_text: [
            {
              text: {
                content: notes?.trim() || projectTitle,
              },
            },
          ],
        };
      }
    }

    // Start Date — date
    if (dbProps["Start Date"]) {
      properties["Start Date"] = {
        date: {
          start: startDate.toISOString(),
        },
      };
    }

    // Due Date — date
    if (dbProps["Due Date"]) {
      properties["Due Date"] = {
        date: {
          start: endDate.toISOString(),
        },
      };
    }

    // Time Logs — rich_text (store a concise summary)
    if (dbProps["Time Logs"]) {
      properties["Time Logs"] = {
        rich_text: [
          {
            text: {
              content: `Duration: ${timerMinutes} min | Start: ${startDate.toLocaleString()} | End: ${endDate.toLocaleString()}`,
            },
          },
        ],
      };
    }

    // Status — detect type: status or select (optional, default to Completed)
    if (dbProps["Status"]) {
      const defaultStatus = status || "Completed";
      if (dbProps["Status"].type === "status") {
        properties["Status"] = {
          status: { name: defaultStatus },
        };
      } else if (dbProps["Status"].type === "select") {
        properties["Status"] = {
          select: { name: defaultStatus },
        };
      }
    }

    // Removed tag mapping; user doesn't need Tags in Notion

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