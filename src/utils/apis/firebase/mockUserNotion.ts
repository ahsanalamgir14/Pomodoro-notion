// Mock implementation for Firebase user functions to avoid offline client errors

// Mock user data for demo purposes - simplified to use single identifier
// This will store real tokens when OAuth completes
const mockUsers: Record<string, any> = {
  "notion-user": {
    id: "notion-user-123",
    email: "notion-user",
    accessToken: null, // Will be set to real token via OAuth
    workspace: null, // Will be set to real workspace via OAuth
    createdAt: new Date().toISOString(),
  },
};

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
  
  console.log("✅ Real Notion token stored successfully");
  return uid;
};