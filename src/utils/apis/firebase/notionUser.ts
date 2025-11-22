const useMock = process.env.NEXT_PUBLIC_DISABLE_FIREBASE === "true" || process.env.DISABLE_FIREBASE === "true";

// dynamic import based on env flags
// eslint-disable-next-line @typescript-eslint/no-var-requires
const impl = useMock
  ? require("./mockUserNotion")
  : require("./userNotion");

export const createNotionUser = impl.createNotionUser as (args: { email: string; accessToken: string; workspace: any }) => Promise<string>;
export const fetchNotionUser = impl.fetchNotionUser as (email: string) => Promise<any>;