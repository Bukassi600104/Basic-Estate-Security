import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/require-session";
import { PwaSwRegister } from "@/components/pwa-sw-register";
import { getInviteById } from "@/lib/repos/pwa-invites";
import { getEstateById } from "@/lib/repos/estates";

export const metadata = {
  title: "Security PWA",
  manifest: "/security-app/manifest.webmanifest",
};

export default async function SecurityAppLayout({ children }: { children: ReactNode }) {
  const inviteId = cookies().get("pwa_security_invite")?.value;
  if (!inviteId) notFound();

  const invite = await getInviteById(inviteId);
  const nowIso = new Date().toISOString();
  if (!invite || invite.type !== "SECURITY" || invite.revokedAt || invite.expiresAt <= nowIso) notFound();

  const estate = await getEstateById(invite.estateId);
  if (!estate || estate.status !== "ACTIVE") notFound();

  const session = await requireSession();
  if (session.role !== "GUARD") notFound();

  return (
    <div className="min-h-[calc(100vh-2rem)]">
      <PwaSwRegister swPath="/security-app/sw.js" scope="/security-app/" />
      {children}
    </div>
  );
}
