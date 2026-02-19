/**
 * Auth helper — checks NextAuth session first, falls back to demo user.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function getUser() {
  // Try NextAuth session first
  if (process.env.NEXTAUTH_SECRET) {
    try {
      const session = await getServerSession(authOptions);
      if (session?.user) {
        return {
          id: (session.user as any).id || DEMO_USER_ID,
          email: session.user.email || "demo@mindcare-ai.com",
        };
      }
    } catch {
      // Fall through to demo user
    }
  }

  // Fallback: demo user for local development
  return { id: DEMO_USER_ID, email: "demo@mindcare-ai.com" };
}
