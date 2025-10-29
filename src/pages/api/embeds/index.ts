import type { NextApiRequest, NextApiResponse } from "next";
import { addEmbed, deleteEmbed, getEmbedsFor, SavedEmbed } from "../../../utils/serverSide/embedsStore";

function getSessionEmail(req: NextApiRequest): string | null {
  const cookieHeader = req.headers.cookie || "";
  const cookies = Object.fromEntries(cookieHeader.split(";").map((c) => {
    const [k, v] = c.trim().split("=");
    return [k, v];
  }));
  return cookies["session_user"] ? decodeURIComponent(cookies["session_user"]) : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const email = getSessionEmail(req);
  if (!email) {
    return res.status(401).json({ error: "Not authenticated", message: "Missing session cookie" });
  }

  if (req.method === "GET") {
    const items = getEmbedsFor(email);
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
    const items = addEmbed(email, item);
    return res.status(200).json({ items });
  }

  if (req.method === "DELETE") {
    const { link } = req.query as { link?: string };
    if (!link) {
      return res.status(400).json({ error: "Missing link query param" });
    }
    const items = deleteEmbed(email, link);
    return res.status(200).json({ items });
  }

  res.setHeader("Allow", ["GET", "POST", "DELETE"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
