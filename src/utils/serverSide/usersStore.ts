import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getDb, sqliteCreateUserRecord, sqliteGetUser, sqliteUpdateUserPassword } from "./sqlite";

export type UserRecord = {
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
};

export function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

export function hashPassword(password: string, salt: string): string {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512");
  return hash.toString("hex");
}

export function createUser(email: string, password: string): UserRecord {
  const key = normalizeEmail(email);
  const db = getDb();
  if (!db) throw new Error("Database not available");

  const existing = sqliteGetUser(db, key);
  if (existing) throw new Error("User already exists");
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const record: UserRecord = { email: key, passwordHash, salt, createdAt: Date.now() };
  sqliteCreateUserRecord(db, record);
  return record;
}

export function getUser(email: string): UserRecord | null {
  const key = normalizeEmail(email);
  const db = getDb();
  if (!db) return null;
  return sqliteGetUser(db, key);
}

export function validatePassword(email: string, password: string): boolean {
  const user = getUser(email);
  if (!user) return false;
  const hash = hashPassword(password, user.salt);
  return hash === user.passwordHash;
}

export function updateUserPassword(email: string, password: string) {
  const key = normalizeEmail(email);
  const db = getDb();
  if (!db) throw new Error("Database not available");

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);

  sqliteUpdateUserPassword(db, key, passwordHash, salt);
}
