import axios, { AxiosError } from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { verifyJWT } from "../../../../utils/serverSide/jwt";
import { showError } from "../../../../utils/apis";
// Use mock implementation for development to avoid Firebase setup
import { createNotionUser } from "../../../../utils/apis/firebase/mockUserNotion";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";

// Helper to read current session email if the user is logged in
async function getSessionEmail(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  const session = await getServerSession(req as any, res as any, authOptions);
  if (session?.user?.email) {
    return String(session.user.email);
  }
  const cookieHeader = req.headers.cookie || "";
  const cookies = Object.fromEntries(cookieHeader.split(";").map((c) => {
    const [k, v] = c.trim().split("=");
    return [k, v];
  }));
  const token = cookies["session_token"];
  if (token) {
    const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "dev-secret";
    const payload = verifyJWT(token, secret);
    if (payload?.email) return String(payload.email);
  }
  return cookies["session_user"] ? decodeURIComponent(cookies["session_user"]) : null;
}

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
      
      // Validate environment variables
      const clientId = process.env.NEXT_PUBLIC_NOTION_AUTH_CLIENT_ID;
      const clientSecret = process.env.NOTION_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        console.error("Missing environment variables:", { clientId: !!clientId, clientSecret: !!clientSecret });
        throw new Error("OAuth configuration error");
      }

      // Compute redirect_uri to satisfy Notion token exchange requirements
      // Prefer explicit env, otherwise derive from forwarded headers
      const redirectUriEnv = process.env.NEXT_PUBLIC_NOTION_AUTH_REDIRECT_URI;
      const forwardedProto = (req.headers["x-forwarded-proto"] as string) || undefined;
      const forwardedHost = (req.headers["x-forwarded-host"] as string) || undefined;
      const hostHeader = req.headers.host;
      const origin = forwardedProto && forwardedHost
        ? `${forwardedProto}://${forwardedHost}`
        : hostHeader
          ? `https://${hostHeader}`
          : undefined;
      const redirectUri = redirectUriEnv || (origin ? `${origin}/api/notion/oauth` : undefined);

      if (!redirectUri) {
        console.error("Missing redirect URI for Notion token exchange");
        return res.redirect("/?error=" + encodeURIComponent("OAuth redirect URI misconfigured. Please contact support."));
      }
      
      console.log("Starting token exchange with Notion API...", { redirectUri });
      const { data } = await axios.post(
        "https://api.notion.com/v1/oauth/token",
        {
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        },
        {
          headers: { "Content-Type": "application/json" },
          auth: {
            username: clientId,
            password: clientSecret,
          },
          timeout: 10000, // 10 second timeout
        }
      );
      console.log("Token exchange successful");
      const { access_token, ...workspaceData } = data;
      
      // Prefer the logged-in user's email; otherwise fallback to simplified identifier
      const existingEmail = await getSessionEmail(req, res);
      const userEmail = existingEmail || "notion-user";
      
      console.log("Creating Notion user in Firebase...");
      try {
        await createNotionUser({
          accessToken: access_token,
          email: userEmail,
          workspace: workspaceData,
        });
        console.log("Notion user created successfully");
        
        // Redirect with success and cache data in client (do NOT override session cookie)
        const cacheData = encodeURIComponent(JSON.stringify({
          accessToken: access_token,
          workspace: workspaceData,
          email: userEmail,
          connectedAt: new Date().toISOString(),
        }));
        res.redirect(`/?notion_connected=true&cache_data=${cacheData}`);
      } catch (firebaseError) {
        console.error("Firebase user creation failed:", firebaseError);
        // Still redirect to home but with a warning
        res.redirect("/?warning=notion_connected_but_save_failed");
      }
    } else {
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    const err = error as AxiosError;
    console.error("OAuth handler error:", err);
    
    // Handle specific timeout errors
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      console.error("OAuth timeout occurred");
      return res.redirect("/?error=" + encodeURIComponent("Connection timeout. Please try again."));
    }
    
    // Handle Notion API errors
    if (err.response?.status === 400) {
      console.error("Notion API error:", err.response.data);
      return res.redirect("/?error=" + encodeURIComponent("Invalid authorization code. Please try connecting again."));
    }
    
    // Handle other errors
    console.error("General OAuth error:", err.message);
    return res.redirect("/?error=" + encodeURIComponent("OAuth failed. Please try again."));
  }
}