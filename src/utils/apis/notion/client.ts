import PomodoroClient from "../PomoCSR";

export interface SaveToNotionParams {
  projectId: string;
  projectTitle: string;
  databaseId: string;
  userId: string;
  timerValue: number;
  startTime: number;
  endTime?: number;
  targetDatabaseId: string;
  status?: string;
  notes?: string;
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

export const getCompletedQuests = async (params: { userId: string; databaseId: string; adventurePageId?: string }) => {
  try {
    const query = new URLSearchParams({ userId: params.userId, databaseId: params.databaseId, ...(params.adventurePageId ? { adventurePageId: params.adventurePageId } : {}) });
    const response = await PomodoroClient.get(`/api/pomo/completed-quests?${query.toString()}`);
    return response.data as { count: number; items: Array<{ id: string; title: string }> };
  } catch (error) {
    console.error("Error fetching completed quests:", error);
    throw error;
  }
};

export const startQuestWork = async (params: { userId: string; questPageId: string; targetDatabaseId?: string; projectTitle?: string; adventurePageId?: string }) => {
  try {
    const response = await PomodoroClient.post("/api/pomo/quest-start", params);
    return response.data;
  } catch (error) {
    console.error("Error starting quest work:", error);
    throw error;
  }
};

export const updateQuestStatus = async (params: { userId: string; status: string; questPageId?: string; adventurePageId?: string; targetDatabaseId?: string }) => {
  try {
    const response = await PomodoroClient.post("/api/pomo/quest-status", params);
    return response.data;
  } catch (error) {
    console.error("Error updating quest status:", error);
    throw error;
  }
};