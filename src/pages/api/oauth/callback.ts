import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { method, query } = req;
    
    if (method === "GET") {
      // Extract the OAuth parameters
      const { code, state, error } = query;
      
      if (error) {
        // Handle OAuth error
        console.error("OAuth error:", error);
        return res.redirect("/?error=" + encodeURIComponent(error as string));
      }
      
      if (code && state) {
        // Redirect to the proper Notion OAuth handler
        const redirectUrl = `/api/notion/oauth?code=${encodeURIComponent(code as string)}&state=${encodeURIComponent(state as string)}`;
        return res.redirect(redirectUrl);
      }
      
      // If no code or state, redirect to home with error
      return res.redirect("/?error=missing_oauth_parameters");
    } else {
      res.setHeader("Allow", ["GET"]);
      res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.redirect("/?error=oauth_callback_failed");
  }
}