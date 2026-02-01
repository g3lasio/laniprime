/**
 * Mock Authentication Hook for Development
 * 
 * Bypasses authentication to allow direct testing of features
 * This will be replaced with real auth in the final phase
 */

import { useCallback, useMemo, useState } from "react";

export type User = {
  id: number;
  openId: string;
  name: string;
  email: string;
  phoneNumber?: string;
  loginMethod: string;
  lastSignedIn: Date;
};

type UseAuthOptions = {
  autoFetch?: boolean;
};

// Mock user for development
const MOCK_USER: User = {
  id: 1,
  openId: "mock-user-123",
  name: "Test User",
  email: "test@laniprime.com",
  phoneNumber: "+1234567890",
  loginMethod: "mock",
  lastSignedIn: new Date(),
};

export function useAuth(options?: UseAuthOptions) {
  const [user] = useState<User | null>(MOCK_USER);
  const [loading] = useState(false);
  const [error] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    // No-op for mock
    console.log("[useAuth] Mock: fetchUser called");
  }, []);

  const logout = useCallback(async () => {
    console.log("[useAuth] Mock: logout called (no-op)");
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    refresh: fetchUser,
    logout,
  };
}
