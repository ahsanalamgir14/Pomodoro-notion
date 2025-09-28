import { Client } from "@notionhq/client";

// Initialize Notion client (you'll need to set up proper authentication)
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

export interface CreateNotionEntryParams {
  databaseId: string;
  projectId: string;
  projectTitle: string;
  timerValue: number; // in seconds
  startTime: number; // timestamp
  endTime?: number; // timestamp
  selectedTags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  sessionType: "work" | "break";
}

export const createNotionEntry = async ({
  databaseId,
  projectId,
  projectTitle,
  timerValue,
  startTime,
  endTime,
  selectedTags,
  sessionType
}: CreateNotionEntryParams) => {
  try {
    // Convert timer value to minutes for better readability
    const timerMinutes = Math.round(timerValue / 60);
    
    // Format start and end times
    const startDate = new Date(startTime * 1000);
    const endDate = endTime ? new Date(endTime * 1000) : new Date();
    
    // Prepare properties for the Notion page
    const properties: any = {
      // Title/Name property (assuming the database has a title property)
      Name: {
        title: [
          {
            text: {
              content: `${projectTitle} - ${sessionType === "work" ? "Work" : "Break"} Session`
            }
          }
        ]
      },
      
      // Project property
      Project: {
        rich_text: [
          {
            text: {
              content: projectTitle
            }
          }
        ]
      },
      
      // Duration in minutes
      Duration: {
        number: timerMinutes
      },
      
      // Session type
      Type: {
        select: {
          name: sessionType === "work" ? "Work" : "Break"
        }
      },
      
      // Start time
      "Start Time": {
        date: {
          start: startDate.toISOString()
        }
      },
      
      // End time
      "End Time": {
        date: {
          start: endDate.toISOString()
        }
      }
    };

    // Add tags if provided and if the database has a Tags property
    if (selectedTags && selectedTags.length > 0) {
      properties.Tags = {
        multi_select: selectedTags.map(tag => ({
          name: tag.name
        }))
      };
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
    const database = await notion.databases.retrieve({
      database_id: databaseId
    });
    
    return database.properties;
  } catch (error) {
    console.error("Error retrieving database properties:", error);
    throw new Error(`Failed to retrieve database properties: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};