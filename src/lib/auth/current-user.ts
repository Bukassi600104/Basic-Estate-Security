import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/repos/users";
import { getEstateById } from "@/lib/repos/estates";

export async function requireCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await getUserById(session.userId);
  if (!user) return null;

  const estate = session.estateId ? await getEstateById(session.estateId) : null;

  return {
    id: user.userId,
    role: session.role,
    estateId: session.estateId ?? null,
    name: user.name,
    email: user.email ?? null,
    phone: user.phone ?? null,
    residentId: user.residentId ?? null,
    estate,
  };
}
