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
    
    // Prepare properties for the Notion page
    const properties: any = {
      // Name — title
      Name: {
        title: [
          {
            text: {
              content: `${projectTitle} Session`,
            },
          },
        ],
      },

      // Quest — text (use project title as quest)
      Quest: {
        rich_text: [
          {
            text: {
              content: projectTitle,
            },
          },
        ],
      },

      // Duration (minutes) — number
      "Duration (minutes)": {
        number: timerMinutes,
      },

      // Start Time — date
      "Start Time": {
        date: {
          start: startDate.toISOString(),
        },
      },

      // End Time — date
      "End Time": {
        date: {
          start: endDate.toISOString(),
        },
      },
    };

    // Status — status (optional, default to Completed)
    if (status || true) {
      properties.Status = {
        status: {
          name: status || "Completed",
        },
      };
    }

    // Notes — text (optional)
    if (notes && notes.trim().length > 0) {
      properties.Notes = {
        rich_text: [
          {
            text: {
              content: notes.trim(),
            },
          },
        ],
      };
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