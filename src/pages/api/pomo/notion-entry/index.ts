import { NextApiRequest, NextApiResponse } from "next";
import { showError } from "../../../../utils/apis";
import { createNotionEntry } from "../../../../utils/apis/notion/entry";

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
        selectedTags,
        targetDatabaseId,
        sessionType // "work" or "break"
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
        // Create entry in the selected Notion database
        const notionEntryId = await createNotionEntry({
          databaseId: targetDatabaseId,
          projectId,
          projectTitle,
          timerValue,
          startTime,
          endTime,
          selectedTags: selectedTags || [],
          sessionType: sessionType || "work"
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