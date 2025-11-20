// Mock implementation for Firebase user functions to avoid offline client errors
import fs from 'fs';
import path from 'path';

// File path for persistent storage
const DATA_FILE = path.join(process.cwd(), '.notion-user-data.json');

// Mock user data for demo purposes - simplified to use single identifier
// This will store real tokens when OAuth completes
let mockUsers: Record<string, any> = {
  "notion-user": {
    id: "notion-user-123",
    email: "notion-user",
    accessToken: null, // Will be set to real token via OAuth
    workspace: null, // Will be set to real workspace via OAuth
    createdAt: new Date().toISOString(),
  },
};

// Load persistent data on startup
const loadPersistentData = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      mockUsers = JSON.parse(data);
      console.log('✅ Loaded persistent user data from file');
    }
  } catch (error) {
    console.log('⚠️ Could not load persistent data, using defaults:', error);
  }
};

// Save data to file
const savePersistentData = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(mockUsers, null, 2));
    console.log('✅ Saved user data to persistent storage');
  } catch (error) {
    console.log('⚠️ Could not save persistent data:', error);
  }
};

// Load data on module initialization
loadPersistentData();

export const fetchNotionUser = async (email: string) => {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));

  const user = mockUsers[email];

  if (!user) {
    console.log("❌ No user found for email:", email);
    return null;
  }

  if (!user.accessToken) {
    console.log("⚠️ User found but no access token available. Please connect to Notion first.");
    return null;
  }

  console.log("✅ User found with valid access token");
  return user;
};

export const getUserByEmail = async (email: string) => {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));

  // Return mock user data
  return mockUsers[email as keyof typeof mockUsers] || null;
};

export const createNotionUser = async ({
  email,
  accessToken,
  workspace,
}: {
  accessToken: string;
  email: string;
  workspace: any;
}) => {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log("🔄 Storing real Notion token for user:", email);
  console.log("🔑 Token preview:", accessToken.substring(0, 20) + "...");

  // Update existing user or create new one with real OAuth data
  const existingUser = mockUsers[email];
  const uid = existingUser?.id || `notion-user-${Date.now()}`;

  // Store real OAuth data in mock system
  mockUsers[email] = {
    id: uid,
    email,
    accessToken, // Real token from Notion OAuth
    workspace, // Real workspace data from Notion
    createdAt: existingUser?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Save to persistent storage
  savePersistentData();

  console.log("✅ Real Notion token stored successfully");
  return uid;
};

export const disconnectNotionUser = async (email: string) => {
  await new Promise(resolve => setTimeout(resolve, 100));
  const existingUser = mockUsers[email];
  if (!existingUser) return false;
  mockUsers[email] = {
    ...existingUser,
    accessToken: null,
    workspace: null,
    updatedAt: new Date().toISOString(),
  };
  savePersistentData();
  return true;
};