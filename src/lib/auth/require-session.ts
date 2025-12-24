import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export async function requireSession(options?: { redirectTo?: string }) {
  const session = await getSession();
  if (!session) redirect(options?.redirectTo ?? "/auth/sign-in");
  return session;
}
