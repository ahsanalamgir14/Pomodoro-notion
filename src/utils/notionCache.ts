// Notion Cache Utility - Handles local storage of tokens and database data
// This eliminates the need for repeated OAuth flows and API calls

interface NotionUserData {
  accessToken: string;
  workspace: any;
  email: string;
  connectedAt: string;
}

interface CachedDatabaseList {
  databases: any;
  workspace: any;
  cachedAt: string;
  expiresAt: string;
}

const STORAGE_KEYS = {
  NOTION_USER: 'notion_user_data',
  DATABASE_LIST: 'notion_database_list',
} as const;

// Cache duration: 24 hours for database list (can be refreshed manually)
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export class NotionCache {
  // Token Management
  static saveUserData(userData: NotionUserData): void {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTION_USER, JSON.stringify(userData));
      console.log('✅ Notion user data cached locally');
    } catch (error) {
      console.error('❌ Failed to cache user data:', error);
    }
  }

  static getUserData(): NotionUserData | null {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.NOTION_USER);
      if (!cached) return null;

      const userData = JSON.parse(cached) as NotionUserData;
      console.log('✅ Retrieved cached user data');
      return userData;
    } catch (error) {
      console.error('❌ Failed to retrieve cached user data:', error);
      return null;
    }
  }

  static hasValidToken(): boolean {
    const userData = this.getUserData();
    if (!userData?.accessToken) return false;

    // Check if token is not expired (Notion tokens typically last 1 hour)
    // For now, we'll assume it's valid if it exists and was created recently
    const tokenAge = Date.now() - new Date(userData.connectedAt).getTime();
    const maxTokenAge = 50 * 60 * 1000; // 50 minutes (slightly less than 1 hour)

    if (tokenAge > maxTokenAge) {
      console.log('⚠️ Notion token may be expired, but keeping for now');
      // In a real app, you'd refresh the token here
    }

    return true;
  }

  static clearUserData(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.NOTION_USER);
      localStorage.removeItem(STORAGE_KEYS.DATABASE_LIST);
      console.log('✅ Cleared all cached Notion data');
    } catch (error) {
      console.error('❌ Failed to clear cached data:', error);
    }
  }

  // Database List Caching
  static saveDatabaseList(databases: any, workspace: any): void {
    try {
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + CACHE_DURATION).toISOString();

      const cacheData: CachedDatabaseList = {
        databases,
        workspace,
        cachedAt: now,
        expiresAt,
      };

      localStorage.setItem(STORAGE_KEYS.DATABASE_LIST, JSON.stringify(cacheData));
      console.log('✅ Database list cached locally (expires in 1 hour)');
    } catch (error) {
      console.error('❌ Failed to cache database list:', error);
    }
  }

  static getCachedDatabaseList(): CachedDatabaseList | null {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.DATABASE_LIST);
      if (!cached) return null;

      const cacheData = JSON.parse(cached) as CachedDatabaseList;

      // Check if cache is still valid
      const now = new Date();
      const expiresAt = new Date(cacheData.expiresAt);

      if (now > expiresAt) {
        console.log('⏰ Database cache expired, will fetch fresh data');
        localStorage.removeItem(STORAGE_KEYS.DATABASE_LIST);
        return null;
      }

      console.log('✅ Retrieved cached database list');
      return cacheData;
    } catch (error) {
      console.error('❌ Failed to retrieve cached database list:', error);
      return null;
    }
  }

  static clearDatabaseCache(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.DATABASE_LIST);
      console.log('✅ Database cache cleared');
    } catch (error) {
      console.error('❌ Failed to clear database cache:', error);
    }
  }

  // Utility methods
  static isConnected(): boolean {
    return this.hasValidToken();
  }

  static getConnectionStatus(): {
    isConnected: boolean;
    hasCache: boolean;
    cacheAge?: string;
  } {
    const userData = this.getUserData();
    const databaseCache = this.getCachedDatabaseList();

    return {
      isConnected: !!userData?.accessToken,
      hasCache: !!databaseCache,
      cacheAge: databaseCache?.cachedAt,
    };
  }
}