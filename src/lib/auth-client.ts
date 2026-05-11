import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : process.env.BETTER_AUTH_URL,
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
export const requestPasswordReset = (email: string, redirectTo: string) =>
  authClient.requestPasswordReset({ email, redirectTo });
export const resetPassword = (newPassword: string, token: string) =>
  authClient.resetPassword({ newPassword, token });
