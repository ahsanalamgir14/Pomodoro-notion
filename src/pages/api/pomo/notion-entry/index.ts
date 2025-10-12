import { NextApiRequest, NextApiResponse } from "next";
import { showError } from "../../../../utils/apis";
import { createNotionEntry } from "../../../../utils/apis/notion/entry";
// Use mock implementation for development to avoid Firebase setup
import { fetchNotionUser } from "../../../../utils/apis/firebase/mockUserNotion";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { method } = req;
    
    if (method === "POST") {
      const { 
        projectId, 
        projectTitle,
        databaseId, 
        userId, 
        timerValue, 
        startTime, 
        endTime,
        targetDatabaseId,
        status,
        notes,
        tags
      } = req.body;

      // Validate required fields
      if (
        !projectId ||
        !projectTitle ||
        !databaseId ||
        !userId ||
        (timerValue == null || timerValue == undefined) ||
        !startTime ||
        !targetDatabaseId
      ) {
        return res.status(400).json({
          error: "Missing required fields",
          required: [
            "projectId",
            "projectTitle", 
            "databaseId",
            "userId",
            "timerValue",
            "startTime",
            "targetDatabaseId"
          ]
        });
      }

      try {
        // Fetch the user's Notion OAuth token (stored locally via mock or Firebase)
        const userData = await fetchNotionUser(userId);
        if (!userData || !userData.accessToken) {
          return res.status(401).json({
            error: "Failed to create Notion entry",
            details: "User is not connected to Notion or token missing.",
          });
        }

        // Create entry in the selected Notion database
        const notionEntryId = await createNotionEntry({
          databaseId: targetDatabaseId,
          projectId,
          projectTitle,
          timerValue,
          startTime,
          endTime,
          status: status || "Completed",
          notes: notes || "",
          tags,
          accessToken: userData.accessToken,
        });

        res.status(200).json({
          message: "Pomodoro session saved to Notion database",
          notionEntryId,
          success: true
        });
      } catch (notionError) {
        console.error("Error creating Notion entry:", notionError);
        res.status(500).json({
          error: "Failed to create Notion entry",
          details: notionError instanceof Error ? notionError.message : "Unknown error"
        });
      }
    } else {
      res.setHeader("Allow", ["POST"]);
      res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error("API Error:", error);
    showError(res);
  }
}