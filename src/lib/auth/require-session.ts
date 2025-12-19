import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/auth/sign-in");
  return session;
}
