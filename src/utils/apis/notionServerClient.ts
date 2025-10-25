import axios, { AxiosError, AxiosRequestConfig } from "axios";

const notionClient = axios.create({
  timeout: 30000, // 30 second timeout
  headers: {
    'Connection': 'keep-alive',
    'Keep-Alive': 'timeout=5, max=1000'
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseErrorCodeV1 = (error: AxiosError) => {
  // Handle specific socket hang up errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('socket hang up')) {
    console.error("🔌 Socket hang up error - connection interrupted:", error.message);
    const enhancedError = new Error("Connection to Notion was interrupted. Please try again.");
    enhancedError.name = "ConnectionError";
    return Promise.reject(enhancedError);
  }
  
  // Handle timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    console.error("⏰ Timeout error:", error.message);
    const timeoutError = new Error("Request to Notion timed out. Please check your connection and try again.");
    timeoutError.name = "TimeoutError";
    return Promise.reject(timeoutError);
  }
  
  return Promise.reject(error);
};

// Request parsing interceptor
const notionRequestInterceptor = (
  config: AxiosRequestConfig
): AxiosRequestConfig => {
  config.baseURL = "https://api.notion.com";
  config.headers = {
    ...config.headers,
    "Notion-Version": "2021-08-16",
  };
  
  // Ensure timeout is set for each request
  if (!config.timeout) {
    config.timeout = 30000; // 30 seconds
  }
  
  return config;
};

// Request parsing interceptor
notionClient.interceptors.request.use(notionRequestInterceptor, (error) => {
  console.error("[REQUEST_ERROR]", error);
  return Promise.reject(error);
});

// Response parsing interceptor
notionClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return parseErrorCodeV1(error);
  }
);
export default notionClient;
