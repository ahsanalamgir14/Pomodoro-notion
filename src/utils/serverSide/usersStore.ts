import fs from "fs";
import path from "path";
import crypto from "crypto";

export type UserRecord = {
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
};

export type UsersStore = {
  [email: string]: UserRecord;
};

const STORE_FILE = path.join(process.cwd(), ".users.json");

function ensureFile() {
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify({}), { encoding: "utf-8" });
  }
}

export function loadUsers(): UsersStore {
  try {
    ensureFile();
    const raw = fs.readFileSync(STORE_FILE, { encoding: "utf-8" });
    const parsed = JSON.parse(raw || "{}");
    return parsed || {};
  } catch (e) {
    console.warn("Failed to load users store:", e);
    return {};
  }
}

export function saveUsers(store: UsersStore) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), { encoding: "utf-8" });
  } catch (e) {
    console.warn("Failed to save users store:", e);
  }
}

export function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

export function hashPassword(password: string, salt: string): string {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512");
  return hash.toString("hex");
}

export function createUser(email: string, password: string): UserRecord {
  const users = loadUsers();
  const key = normalizeEmail(email);
  if (users[key]) {
    throw new Error("User already exists");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const record: UserRecord = {
    email: key,
    passwordHash,
    salt,
    createdAt: Date.now(),
  };
  users[key] = record;
  saveUsers(users);
  return record;
}

export function getUser(email: string): UserRecord | null {
  const users = loadUsers();
  const key = normalizeEmail(email);
  return users[key] || null;
}

export function validatePassword(email: string, password: string): boolean {
  const user = getUser(email);
  if (!user) return false;
  const hash = hashPassword(password, user.salt);
  return hash === user.passwordHash;
}
