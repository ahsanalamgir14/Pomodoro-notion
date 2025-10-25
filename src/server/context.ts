"use server";

import * as trpcNext from "@trpc/server/adapters/next";

export async function createContext(ctx: trpcNext.CreateNextContextOptions) {
  try {
    // Custom auth context - you can add custom session logic here if needed
    return {
      session: null, // Placeholder for custom session
    };
  } catch (e) {
    throw e;
  }
}
export type Context = Awaited<ReturnType<typeof createContext>>;
