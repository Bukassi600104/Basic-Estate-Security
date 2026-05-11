import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getUserById } from "@/lib/repos/users";

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

    return {
      userId: user.id,
      role: profile.role,
      estateId: profile.estateId ?? undefined,
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
