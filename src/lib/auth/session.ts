import { createSupabaseServerClient } from "@/lib/supabase/client";
import { cookies } from "next/headers";
import { getUserById, listAdminEstateAccess } from "@/lib/repos/users";

export type SessionClaims = {
  userId: string;
  role: string;
  estateId?: string;
  name: string;
  mfaEnabled?: boolean;
};

export async function getSession(): Promise<SessionClaims | null> {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const profile = await getUserById(user.id);
    if (!profile) return null;

    let estateId = profile.estateId ?? undefined;
    let role = profile.role;

    if (profile.role === "ESTATE_ADMIN" || profile.role === "SUB_ADMIN") {
      const selectedEstateId = cookies().get("gatepilot_estate_id")?.value;
      const access = await listAdminEstateAccess({ userId: user.id });
      const selectedAccess = selectedEstateId
        ? access.find((item) => item.estateId === selectedEstateId)
        : null;

      if (selectedAccess) {
        estateId = selectedAccess.estateId;
        role = selectedAccess.role;
      } else if (estateId && !access.some((item) => item.estateId === estateId)) {
        estateId = profile.estateId ?? undefined;
      }
    }

    return {
      userId: user.id,
      role,
      estateId,
      name: profile.name,
      mfaEnabled: false,
    };
  } catch {
    return null;
  }
}

export async function getSessionUserId(): Promise<string | null> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
