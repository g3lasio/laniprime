import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    // In development mode, inject a mock user for testing
    if (process.env.NODE_ENV === "development") {
      console.log("[Dev Mode] Using mock user for development");
      user = {
        id: 1,
        openId: "dev-mock-user",
        name: "Test User",
        email: "test@laniprime.dev",
        phoneNumber: "+1234567890",
        role: "user",
        tenantId: 1,
        loginMethod: "mock",
        lastSignedIn: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;
    } else {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
