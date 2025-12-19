import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function requireCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { resident: true, estate: true },
  });

  return user;
}
