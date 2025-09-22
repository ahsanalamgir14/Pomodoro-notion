import { DatabaseList } from "../../../types/database/database.list";
import { DatabaseQuery } from "../../../types/database/databaseQuery";
import notionClient from "../notionServerClient";
import NotionClient from "../notionCSR";
import { DatabaseDetail } from "../../../types/database/databaseDetail";

const BASE_DATABASE = "/v1/databases";

// Retry utility function with exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on authentication errors (401, 403)
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw error;
      }
      
      // Don't retry on client errors (4xx except 401, 403)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }
      
      // Retry on network errors, timeouts, and server errors
      const shouldRetry = 
        error.code === 'ECONNABORTED' ||
        error.message?.includes('socket hang up') ||
        error.message?.includes('timeout') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('ENOTFOUND') ||
        (error.response?.status >= 500);
      
      if (!shouldRetry || attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`🔄 Retrying API call in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

export const queryDatabase = async (
  id: string,
  serverSide = false,
  token = ""
): Promise<DatabaseQuery> => {
  return await retryWithBackoff(() => fetchDatabasePages(id, serverSide, token));
};

const fetchDatabasePages = async (
  id: string,
  serverSide = false,
  token = "",
  next_cursor: string | undefined = undefined
): Promise<DatabaseQuery> => {
  const { data } = serverSide
    ? await notionClient.post<DatabaseQuery>(
        BASE_DATABASE + "/" + id + "/query",
        next_cursor != undefined || next_cursor != null
          ? {
              start_cursor: next_cursor,
            }
          : {},
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      )
    : await NotionClient.post<DatabaseQuery>(
        BASE_DATABASE + "/" + id + "/query"
      );

  if (data.has_more) {
    const nextData = await retryWithBackoff(() =>
      fetchDatabasePages(
        id,
        serverSide,
        token,
        data.next_cursor
      )
    );
    data.results = data.results.concat(nextData.results);
  }
  return data;
};

export const retrieveDatabase = async (
  id: string,
  serverSide = false,
  token = ""
): Promise<DatabaseDetail> => {
  return await retryWithBackoff(async () => {
    const { data } = serverSide
      ? await notionClient.get(BASE_DATABASE + "/" + id, {
          headers: {
            Authorization: "Bearer " + token,
          },
        })
      : await NotionClient.get(BASE_DATABASE + "/" + id);
    return data;
  });
};

export const listDatabases = async (
  serverSide = false,
  token = ""
): Promise<DatabaseList> => {
  return await retryWithBackoff(() => fetchDatabases(serverSide, token));
};

const fetchDatabases = async (
  serverSide = false,
  token = "",
  next_cursor: string | undefined | null = undefined
) => {
  const { data } = serverSide
    ? await notionClient.get<DatabaseList>(BASE_DATABASE, {
        headers: {
          Authorization: "Bearer " + token,
        },
        params: {
          start_cursor: next_cursor,
        },
      })
    : await NotionClient.get<DatabaseList>(BASE_DATABASE);

  if (data.has_more && data.results) {
    const nextData = await retryWithBackoff(() => 
      fetchDatabases(serverSide, token, data.next_cursor)
    );
    if (nextData.results) data.results = data.results.concat(nextData.results);
  }

  return data;
};
