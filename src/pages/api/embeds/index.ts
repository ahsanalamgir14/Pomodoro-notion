import type { NextApiRequest, NextApiResponse } from "next";
import { addEmbed, deleteEmbed, getEmbedsFor, SavedEmbed } from "../../../utils/serverSide/embedsStore";
import { verifyJWT } from "../../../utils/serverSide/jwt";
import { getDb, sqliteAddEmbed, sqliteDeleteEmbed, sqliteGetEmbeds } from "../../../utils/serverSide/sqlite";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

async function resolveEmail(req: NextApiRequest): Promise<string | null> {
  const session = await getServerSession(req as any, {} as any, authOptions).catch(() => null);
  if (session?.user?.email) return String(session.user.email);
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
  if (cookies["session_user"]) return decodeURIComponent(cookies["session_user"]);
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const override = (req.method === "POST" ? (req.body as any)?.email : (req.method === "GET" ? (req.query as any)?.email : undefined)) as string | undefined;
  const sessionEmail = await resolveEmail(req);
  const email = override || sessionEmail;
  if (!email) {
    return res.status(401).json({ error: "Not authenticated", message: "Missing session" });
  }
  const db = getDb();

  if (req.method === "GET") {
    const items = db ? sqliteGetEmbeds(db, email) : getEmbedsFor(email);
    return res.status(200).json({ items });
  }

  if (req.method === "POST") {
    const { id, title, link, config } = req.body as Partial<SavedEmbed>;
    if (!link) {
      return res.status(400).json({ error: "Missing link" });
    }
    const item: SavedEmbed = {
      id: id || "default",
      title: title || "Untitled Embed",
      link,
      config,
      createdAt: Date.now(),
    };
    const items = db ? sqliteAddEmbed(db, email, item) : addEmbed(email, item);
    return res.status(200).json({ items });
  }

  if (req.method === "DELETE") {
    const { link } = req.query as { link?: string };
    if (!link) {
      return res.status(400).json({ error: "Missing link query param" });
    }
    const items = db ? sqliteDeleteEmbed(db, email, link) : deleteEmbed(email, link);
    return res.status(200).json({ items });
  }

  res.setHeader("Allow", ["GET", "POST", "DELETE"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
