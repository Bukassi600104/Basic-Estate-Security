import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/require-session";
import { PwaSwRegister } from "@/components/pwa-sw-register";
import { getInviteById } from "@/lib/repos/pwa-invites";
import { getEstateById } from "@/lib/repos/estates";

export const metadata = {
  title: "Resident PWA",
  manifest: "/resident-app/manifest.webmanifest",
};

export default async function ResidentAppLayout({ children }: { children: ReactNode }) {
  const inviteId = cookies().get("pwa_resident_invite")?.value;
  if (!inviteId) notFound();

  const invite = await getInviteById(inviteId);
  const nowIso = new Date().toISOString();
  if (!invite || invite.type !== "RESIDENT" || invite.revokedAt || invite.expiresAt <= nowIso) notFound();

  const estate = await getEstateById(invite.estateId);
  if (!estate || estate.status !== "ACTIVE") notFound();

  const session = await requireSession({ redirectTo: "/auth/sign-in" });
  if (session.role !== "RESIDENT" && session.role !== "RESIDENT_DELEGATE") notFound();

  return (
    <div className="min-h-[calc(100vh-2rem)]">
      <PwaSwRegister swPath="/resident-app/sw.js" scope="/resident-app/" />
      {children}
    </div>
  );
}
