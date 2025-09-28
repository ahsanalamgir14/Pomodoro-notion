import PomodoroClient from "../PomoCSR";

export interface SaveToNotionParams {
  projectId: string;
  projectTitle: string;
  databaseId: string;
  userId: string;
  timerValue: number;
  startTime: number;
  endTime?: number;
  selectedTags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  targetDatabaseId: string;
  sessionType: "work" | "break";
}

export const savePomoSessionToNotion = async (params: SaveToNotionParams) => {
  try {
    const response = await PomodoroClient.post("/api/pomo/notion-entry", params);
    return response.data;
  } catch (error) {
    console.error("Error saving to Notion:", error);
    throw error;
  }
};

export interface DatabaseOption {
  label: string;
  value: string;
  icon?: string;
}

// Function to get available databases for the user
export const getAvailableDatabases = async (userId: string): Promise<DatabaseOption[]> => {
  try {
    // This function is not used in the current implementation
    // The app uses tRPC to fetch databases via trpc.private.getDatabases.useQuery
    // Return empty array since this is handled by the tRPC router
    console.log("getAvailableDatabases called but not implemented - using tRPC instead");
    return [];
  } catch (error) {
    console.error("Error fetching databases:", error);
    // Return empty array if there's an error
    return [];
  }
};

// Function to validate if a database can accept Pomodoro entries
export const validateDatabaseForPomodoro = async (databaseId: string) => {
  try {
    // This function is not used in the current implementation
    // Database validation is handled by the tRPC router
    console.log("validateDatabaseForPomodoro called but not implemented - using tRPC instead");
    return { valid: true, message: "Database validation not implemented" };
  } catch (error) {
    console.error("Error validating database:", error);
    return { valid: false, message: "Unable to validate database" };
  }
};