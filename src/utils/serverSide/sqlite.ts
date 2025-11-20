import path from "path";
import fs from "fs";

type DB = any;

function loadModule() {
  try {
    const req = new Function("return require")();
    return req("better-sqlite3");
  } catch {
    return null;
  }
}

function init(db: DB) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS embeds (email TEXT NOT NULL, id TEXT NOT NULL, title TEXT NOT NULL, link TEXT NOT NULL, createdAt INTEGER NOT NULL, config TEXT, PRIMARY KEY(email, link))"
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, passwordHash TEXT NOT NULL, salt TEXT NOT NULL, createdAt INTEGER NOT NULL)"
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS notion_users (email TEXT PRIMARY KEY, accessToken TEXT, workspace TEXT, createdAt INTEGER NOT NULL, updatedAt INTEGER)"
  );
}

export function getDb(): DB | null {
  if (process.env.USE_SQLITE !== "true") return null;
  const mod = loadModule();
  if (!mod) return null;
  const dbPath = path.join(process.cwd(), ".data.db");
  const db = mod(dbPath);
  init(db);
  migrateUsersJson(db);
  migrateNotionJson(db);
  if (process.env.DELETE_LEGACY_JSON_AFTER_MIGRATION === "true") {
    deleteUsersJsonIfMigrated(db);
    deleteNotionJsonIfMigrated(db);
  }
  return db;
}

export function sqliteGetEmbeds(db: DB, email: string) {
  const stmt = db.prepare("SELECT id, title, link, createdAt, config FROM embeds WHERE email = ? ORDER BY createdAt DESC");
  const rows = stmt.all(email);
  return rows.map((r: any) => ({ id: r.id, title: r.title, link: r.link, createdAt: r.createdAt, config: r.config ? JSON.parse(r.config) : undefined }));
}

export function sqliteAddEmbed(db: DB, email: string, embed: { id: string; title: string; link: string; createdAt: number; config?: any }) {
  const cfg = embed.config ? JSON.stringify(embed.config) : null;
  const stmt = db.prepare("INSERT OR IGNORE INTO embeds (email, id, title, link, createdAt, config) VALUES (?, ?, ?, ?, ?, ?)");
  stmt.run(email, embed.id, embed.title, embed.link, embed.createdAt, cfg);
  return sqliteGetEmbeds(db, email);
}

export function sqliteDeleteEmbed(db: DB, email: string, link: string) {
  const stmt = db.prepare("DELETE FROM embeds WHERE email = ? AND link = ?");
  stmt.run(email, link);
  return sqliteGetEmbeds(db, email);
}

export function sqliteGetUser(db: DB, email: string) {
  const stmt = db.prepare("SELECT email, passwordHash, salt, createdAt FROM users WHERE email = ?");
  const row = stmt.get(email);
  if (!row) return null;
  return { email: row.email as string, passwordHash: row.passwordHash as string, salt: row.salt as string, createdAt: Number(row.createdAt) };
}

export function sqliteCreateUserRecord(db: DB, record: { email: string; passwordHash: string; salt: string; createdAt: number }) {
  const stmt = db.prepare("INSERT INTO users (email, passwordHash, salt, createdAt) VALUES (?, ?, ?, ?)");
  stmt.run(record.email, record.passwordHash, record.salt, record.createdAt);
}

export function sqliteUpsertNotionUser(db: DB, payload: { email: string; accessToken: string; workspace: any }) {
  const cfg = payload.workspace ? JSON.stringify(payload.workspace) : null;
  const now = Date.now();
  const stmt = db.prepare("INSERT INTO notion_users (email, accessToken, workspace, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET accessToken=excluded.accessToken, workspace=excluded.workspace, updatedAt=excluded.updatedAt");
  stmt.run(payload.email, payload.accessToken, cfg, now, now);
}

export function sqliteFetchNotionUser(db: DB, email: string) {
  const stmt = db.prepare("SELECT email, accessToken, workspace, createdAt, updatedAt FROM notion_users WHERE email = ?");
  const row = stmt.get(email);
  if (!row) return null;
  if (!row.accessToken) return null;
  return { id: email, email: email, accessToken: String(row.accessToken), workspace: row.workspace ? JSON.parse(row.workspace) : null };
}

export function sqliteDisconnectNotionUser(db: DB, email: string) {
  const stmt = db.prepare("UPDATE notion_users SET accessToken = NULL, workspace = NULL, updatedAt = ? WHERE email = ?");
  stmt.run(Date.now(), email);
}

function migrateUsersJson(db: DB) {
  const p = path.join(process.cwd(), ".users.json");
  if (!fs.existsSync(p)) return;
  try {
    const raw = fs.readFileSync(p, { encoding: "utf-8" });
    const json = JSON.parse(raw || "{}");
    const stmtGet = db.prepare("SELECT email FROM users WHERE email = ?");
    const stmtIns = db.prepare("INSERT INTO users (email, passwordHash, salt, createdAt) VALUES (?, ?, ?, ?)");
    Object.keys(json || {}).forEach((email) => {
      const rec = json[email];
      const exists = stmtGet.get(email);
      if (!exists && rec?.email && rec?.passwordHash && rec?.salt) {
        stmtIns.run(String(rec.email), String(rec.passwordHash), String(rec.salt), Number(rec.createdAt || Date.now()));
      }
    });
  } catch {}
}

function migrateNotionJson(db: DB) {
  const p = path.join(process.cwd(), ".notion-user-data.json");
  if (!fs.existsSync(p)) return;
  try {
    const raw = fs.readFileSync(p, { encoding: "utf-8" });
    const json = JSON.parse(raw || "{}");
    const stmt = db.prepare("INSERT INTO notion_users (email, accessToken, workspace, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET accessToken=excluded.accessToken, workspace=excluded.workspace, updatedAt=excluded.updatedAt");
    Object.keys(json || {}).forEach((email) => {
      const rec = json[email];
      const cfg = rec?.workspace ? JSON.stringify(rec.workspace) : null;
      const at = rec?.accessToken || null;
      const created = rec?.createdAt ? Date.parse(rec.createdAt) : Date.now();
      const updated = rec?.updatedAt ? Date.parse(rec.updatedAt) : Date.now();
      stmt.run(String(email), at ? String(at) : null, cfg, created, updated);
    });
  } catch {}
}

function deleteUsersJsonIfMigrated(db: DB) {
  const p = path.join(process.cwd(), ".users.json");
  if (!fs.existsSync(p)) return;
  try {
    const raw = fs.readFileSync(p, { encoding: "utf-8" });
    const json = JSON.parse(raw || "{}");
    const stmtGet = db.prepare("SELECT email FROM users WHERE email = ?");
    const emails = Object.keys(json || {});
    const allPresent = emails.every((email) => !!stmtGet.get(email));
    if (allPresent) fs.unlinkSync(p);
  } catch {}
}

function deleteNotionJsonIfMigrated(db: DB) {
  const p = path.join(process.cwd(), ".notion-user-data.json");
  if (!fs.existsSync(p)) return;
  try {
    const raw = fs.readFileSync(p, { encoding: "utf-8" });
    const json = JSON.parse(raw || "{}");
    const stmtGet = db.prepare("SELECT email FROM notion_users WHERE email = ?");
    const emails = Object.keys(json || {});
    const allPresent = emails.every((email) => !!stmtGet.get(email));
    if (allPresent) fs.unlinkSync(p);
  } catch {}
}