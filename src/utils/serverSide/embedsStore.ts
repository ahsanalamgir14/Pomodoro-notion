import fs from "fs";
import path from "path";

export type SavedEmbed = {
  id: string; // page id or "default"
  title: string;
  link: string;
  createdAt: number;
  config?: any;
};

export type EmbedsStore = {
  [email: string]: SavedEmbed[];
};

const STORE_FILE = path.join(process.cwd(), ".saved-embeds.json");

function ensureFile() {
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify({}), { encoding: "utf-8" });
  }
}

export function loadStore(): EmbedsStore {
  try {
    ensureFile();
    const raw = fs.readFileSync(STORE_FILE, { encoding: "utf-8" });
    const parsed = JSON.parse(raw || "{}");
    return parsed || {};
  } catch (e) {
    console.warn("Failed to load embeds store:", e);
    return {};
  }
}

export function saveStore(store: EmbedsStore) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), { encoding: "utf-8" });
  } catch (e) {
    console.warn("Failed to save embeds store:", e);
  }
}

export function getEmbedsFor(email: string): SavedEmbed[] {
  const store = loadStore();
  return store[email] || [];
}

export function addEmbed(email: string, embed: SavedEmbed): SavedEmbed[] {
  const store = loadStore();
  const list = store[email] || [];
  const exists = list.some((e) => e.link === embed.link);
  const next = exists ? list : [embed, ...list];
  store[email] = next;
  saveStore(store);
  return next;
}

export function deleteEmbed(email: string, link: string): SavedEmbed[] {
  const store = loadStore();
  const list = store[email] || [];
  const next = list.filter((e) => e.link !== link);
  store[email] = next;
  saveStore(store);
  return next;
}
