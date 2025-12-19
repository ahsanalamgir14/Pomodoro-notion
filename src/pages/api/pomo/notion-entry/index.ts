import { NextApiRequest, NextApiResponse } from "next";
import { showError } from "../../../../utils/apis";
import { createNotionEntry } from "../../../../utils/apis/notion/entry";
import { fetchNotionUser } from "../../../../utils/apis/firebase/notionUser";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { verifyJWT } from "../../../../utils/serverSide/jwt";

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
        sessionTitle,
        databaseId, 
        userId, 
        timerValue, 
        startTime, 
        endTime,
        targetDatabaseId,
        status,
        notes,
        tags,
        questPageId,
        questPageIds,
        accessToken
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
        const session = await getServerSession(req as any, res as any, authOptions).catch(() => null);
        const cookieHeader = req.headers.cookie || "";
        const cookies = Object.fromEntries(cookieHeader.split(";").map((c) => { const [k,v] = c.trim().split("="); return [k,v]; }));
        const jwt = cookies["session_token"]; const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "dev-secret";
        const jwtPayload = jwt ? verifyJWT(jwt, secret) : null;
        const legacy = cookies["session_user"] ? decodeURIComponent(cookies["session_user"]) : null;
        const candidates: string[] = [userId, session?.user?.email, (jwtPayload?.email as string) || undefined, legacy, "notion-user"].filter(Boolean) as string[];
        
        let token: string | null = accessToken || null;
        if (!token) {
          for (const id of candidates) {
            const u = await fetchNotionUser(id!);
            if (u?.accessToken) { token = u.accessToken; break; }
          }
        }
        if (!token) {
          const envToken = process.env.NOTION_TOKEN || null;
          if (!envToken) {
            return res.status(401).json({ error: "Failed to create Notion entry", details: "User is not connected to Notion or token missing." });
          }
          token = envToken;
        }

        const notionEntryId = await createNotionEntry({
          databaseId: targetDatabaseId,
          sourceDatabaseId: databaseId,
          projectId,
          projectTitle,
          sessionTitle,
          timerValue,
          startTime,
          endTime,
          status: status || "Completed",
          notes: notes || "",
          tags,
          questPageId,
          questPageIds,
          accessToken: token,
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
