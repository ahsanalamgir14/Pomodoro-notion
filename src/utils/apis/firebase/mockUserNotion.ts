// Mock implementation for Firebase user functions to avoid offline client errors

// Mock user data for demo purposes
const mockUsers = {
  "demo@example.com": {
    id: "demo-user-123",
    email: "demo@example.com",
    accessToken: "demo-notion-access-token",
    workspace: {
      id: "demo-workspace-123",
      name: "Demo Workspace",
      icon: "🚀",
    },
    createdAt: new Date().toISOString(),
  },
};

export const fetchNotionUser = async (email: string) => {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Return mock user data
  return mockUsers[email as keyof typeof mockUsers] || null;
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
  
  // Generate a mock UUID
  const uid = `mock-user-${Date.now()}`;
  
  // Store in mock data (in a real app, this would persist)
  (mockUsers as any)[email] = {
    id: uid,
    email,
    accessToken,
    workspace,
    createdAt: new Date().toISOString(),
  };
  
  return uid;
};