import {
  listDatabases,
  queryDatabase,
  retrieveDatabase,
} from "@/utils/apis/notion/database";
import { publicProcedure, router } from "../trpc";
import { z } from "zod";
// Use mock implementation for development to avoid Firebase setup
import { fetchNotionUser } from "@/utils/apis/firebase/mockUserNotion";

export const privateRouter = router({
  getDatabases: publicProcedure
    .input(
      z.object({
        email: z.string(),
      })
    )
    .query(async ({ input: { email } }) => {
      try {
        let userData = await fetchNotionUser(email);
        if ((!userData || !userData.accessToken) && email !== "notion-user") {
          userData = await fetchNotionUser("notion-user");
        }
        const token = userData?.accessToken || process.env.NOTION_TOKEN;
        if (!token) {
          return {
            databases: { results: [] },
            workspace: null,
            error: "User not found or not connected to Notion",
          };
        }
        const databases = await listDatabases(true, token);
        return {
          databases,
          workspace: userData?.workspace || { name: "Default Workspace" },
        };
      } catch (error: any) {
        console.log("❌ API call failed:", error.message);
        console.log("❌ Error status:", error.response?.status);
        console.log("❌ Error data:", error.response?.data);
        
        // Handle specific error types with user-friendly messages
        if (error.name === "ConnectionError" || error.message?.includes("Connection to Notion was interrupted")) {
          throw new Error("Connection to Notion was interrupted. Please check your internet connection and try again.");
        }
        
        if (error.name === "TimeoutError" || error.message?.includes("timed out")) {
          throw new Error("Request to Notion timed out. Please check your connection and try again.");
        }
        
        // Handle socket hang up errors that might not be caught by the client
        if (error.message?.includes("socket hang up")) {
          throw new Error("Connection to Notion was lost. Please try connecting again.");
        }
        
        throw error;
      }
    }),
  getDatabaseDetail: publicProcedure
    .input(
      z.object({
        databaseId: z.string(),
        email: z.string(),
      })
    )
    .query(async ({ input: { databaseId, email } }) => {
      let userData = await fetchNotionUser(email);
      if ((!userData || !userData.accessToken) && email !== "notion-user") {
        userData = await fetchNotionUser("notion-user");
      }
      const token = userData?.accessToken || process.env.NOTION_TOKEN;
      if (!token) {
        throw new Error("User not found or not connected to Notion");
      }
      const [database, db] = await Promise.all([
        queryDatabase(databaseId, true, token),
        retrieveDatabase(databaseId, true, token),
      ]);
      return {
        userId: userData?.id || "demo-user",
        database,
        db,
      };
    }),
  queryDatabase: publicProcedure
    .input(
      z.object({
        databaseId: z.string(),
        email: z.string(),
      })
    )
    .query(async ({ input: { databaseId, email } }) => {
      let userData = await fetchNotionUser(email);
      if ((!userData || !userData.accessToken) && email !== "notion-user") {
        userData = await fetchNotionUser("notion-user");
      }
      const token = userData?.accessToken || process.env.NOTION_TOKEN;
      if (!token) {
        throw new Error("User not found or not connected to Notion");
      }
      const database = await queryDatabase(databaseId as string, true, token);
      return { database };
    }),
});
