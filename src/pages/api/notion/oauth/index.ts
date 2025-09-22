import axios, { AxiosError } from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { showError } from "../../../../utils/apis";
import { createNotionUser } from "../../../../utils/apis/firebase/userNotion";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { method } = req;
    if (method == "GET") {
      const { code, state } = req.query;
      
      if (!code) {
        throw new Error("No authorization code found");
      }
      
      if (!state || state === "undefined") {
        // Redirect with error message
        return res.redirect("/?error=" + encodeURIComponent("OAuth state parameter missing. Please try connecting again."));
      }
      
      const stateParam = state as string;
      if (!stateParam || stateParam.trim() === "") {
        throw new Error("Invalid state parameter");
      }
      const { data } = await axios.post(
        "https://api.notion.com/v1/oauth/token",
        {
          grant_type: "authorization_code",
          code,
        },
        {
          headers: { "Content-Type": "application/json" },
          auth: {
            username: process.env.NEXT_PUBLIC_NOTION_AUTH_CLIENT_ID as string,
            password: process.env.NOTION_CLIENT_SECRET as string,
          },
        }
      );
      const { access_token, ...workspaceData } = data;
      
      // Determine user email: use state if it's an email, otherwise generate from workspace
      let userEmail: string;
      const isEmail = stateParam.includes('@');
      
      if (isEmail) {
        userEmail = stateParam;
      } else {
        // Generate email from workspace data or use a default pattern
        const workspaceName = workspaceData.workspace_name || workspaceData.workspace_id || 'user';
        userEmail = `${workspaceName.toLowerCase().replace(/[^a-z0-9]/g, '')}@notion-workspace.local`;
      }
      
      await createNotionUser({
        accessToken: access_token,
        email: userEmail,
        workspace: workspaceData,
      });
      res.redirect("/");
    } else {
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    const err = error as AxiosError;
    showError(res, err.message);
  }
}
