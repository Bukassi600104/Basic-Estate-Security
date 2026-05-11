import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/repos/users";
import { getResidentById } from "@/lib/repos/residents";
import { getEstateById } from "@/lib/repos/estates";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (session.role !== "RESIDENT" && session.role !== "RESIDENT_DELEGATE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const user = await getUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let houseNumber: string | undefined;
  let phone: string | undefined;
  let estateName: string | undefined;
  let verificationCode: string | undefined;

  if (user.residentId) {
    const resident = await getResidentById(user.residentId);
    if (resident) {
      houseNumber = resident.houseNumber;
      phone = resident.phone;
      verificationCode = resident.verificationCode;
    }
  }

  if (user.estateId) {
    const estate = await getEstateById(user.estateId);
    if (estate) {
      estateName = estate.name;
    }
  }

  return NextResponse.json({
    ok: true,
    profile: {
      userId: user.userId,
      name: user.name,
      role: user.role,
      passwordChanged: user.passwordChanged ?? false,
      houseNumber,
      phone,
      estateName,
      verificationCode,
    },
  });
}
