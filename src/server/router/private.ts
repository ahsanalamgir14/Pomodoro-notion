import {
  listDatabases,
  queryDatabase,
  retrieveDatabase,
} from "@/utils/apis/notion/database";
import { publicProcedure, router } from "../trpc";
import { z } from "zod";
import { fetchNotionUser } from "@/utils/apis/firebase/userNotion";

export const privateRouter = router({
  getDatabases: publicProcedure
    .input(
      z.object({
        email: z.string(),
      })
    )
    .query(async ({ input: { email } }) => {
      console.log("🔍 Fetching user data for email:", email);
      
      try {
        // Get the user's stored access token from Firebase
        const userData = await fetchNotionUser(email);
        
        if (!userData || !userData.accessToken) {
          console.log("❌ No user data or access token found for email:", email);
          return {
            databases: {
              results: [],
            },
            workspace: null,
            error: "User not found or not connected to Notion",
          };
        }

        console.log("🔑 Access token found for user");
        console.log("📡 Making API call to list databases...");
        
        const databases = await listDatabases(true, userData.accessToken);
        console.log("✅ API call successful");
        
        return {
          databases,
          workspace: userData.workspace || { name: "Default Workspace" },
        };
      } catch (error: any) {
        console.log("❌ API call failed:", error.message);
        console.log("❌ Error status:", error.response?.status);
        console.log("❌ Error data:", error.response?.data);
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
      console.log("🔍 Fetching database detail for:", databaseId, "user:", email);
      
      // Get the user's stored access token from Firebase
      const userData = await fetchNotionUser(email);
      
      if (!userData || !userData.accessToken) {
        throw new Error("User not found or not connected to Notion");
      }

      const [database, db] = await Promise.all([
        queryDatabase(databaseId, true, userData.accessToken),
        retrieveDatabase(databaseId, true, userData.accessToken),
      ]);

      return {
        userId: userData.id || "demo-user",
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
      console.log("🔍 Querying database:", databaseId, "for user:", email);
      
      // Get the user's stored access token from Firebase
      const userData = await fetchNotionUser(email);
      
      if (!userData || !userData.accessToken) {
        throw new Error("User not found or not connected to Notion");
      }

      const database = await queryDatabase(
        databaseId as string,
        true,
        userData.accessToken
      );

      return {
        database,
      };
    }),
});
