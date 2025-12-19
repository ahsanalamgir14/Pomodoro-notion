import { startOfDay } from "date-fns";
import { NextApiRequest, NextApiResponse } from "next";
import { showError } from "../../../../utils/apis";
import {
  deleteTimesheet,
  getTimesheets,
  insertTimesheet,
} from "../../../../utils/apis/firebase/timesheet";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { method } = req;
    const firebaseDisabled = process.env.DISABLE_FIREBASE === "true";
    let userId = req.query.userId as string;
    const token = (req.body?.accessToken as string) || (req.query?.accessToken as string);

    // If userId is missing but we have accessToken, try to resolve it
    if (!userId && token) {
      try {
        const { Client } = require("@notionhq/client");
        const notion = new Client({ auth: token });
        const user = await notion.users.me({});
        if (user?.id) {
          userId = user.id;
        }
      } catch (e) {
        console.warn("Failed to resolve user from accessToken in timesheet api", e);
      }
    }

    const startDate = Math.floor(
      Number(
        (req.query.startDate as string) ??
          startOfDay(new Date()).getTime() / 1000
      )
    );
    const endDate = Math.floor(
      Number((req.query.endDate as string) ?? new Date().getTime() / 1000)
    );
    if (!userId) throw new Error("UserId not found");

    // If Firebase is disabled, short-circuit API responses to avoid 500s
    if (firebaseDisabled) {
      if (method === "GET") {
        return res.status(200).json([]);
      }
      if (method === "POST") {
        return res.status(200).json({ message: "Timesheet saving disabled", id: null, disabled: true });
      }
      if (method === "DELETE") {
        return res.status(200).json({ message: "Timesheet deletion disabled", id: null, disabled: true });
      }
    }
    if (method == "GET") {
      res.status(200).json(
        await getTimesheets(userId, {
          startDate,
          endDate,
        })
      );
    } else if (method == "POST") {
      const { projectId, databaseId, timerValue, startTime, endTime, accessToken } =
        req.body;
      if (
        projectId &&
        databaseId &&
        (timerValue != null || timerValue != undefined) &&
        startTime
      ) {
        // Optional: Validate accessToken if integration with Notion is required in future
        if (accessToken) {
          // No-op validation for now, but ready for future use
        }
        res.status(200).json({
          message: "Timesheet created",
          id: await insertTimesheet({
            projectId,
            databaseId,
            userId,
            timerValue,
            startTime,
            endTime,
          }),
        });
      } else {
        showError(res);
      }
    } else if (method == "DELETE") {
      const { timesheetId, projectId, userId } = req.query;
      if (timesheetId && userId && projectId) {
        res.status(200).json({
          message: "Timesheet deleted",
          id: await deleteTimesheet({
            userId: userId as string,
            projectId: projectId as string,
            timesheetId: timesheetId as string,
          }),
        });
      } else {
        showError(res);
      }
    } else {
      res.setHeader("Allow", ["GET", "POST", "DELETE"]);
      res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.log(error);
    showError(res);
  }
}
