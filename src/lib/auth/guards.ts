import { NextResponse } from "next/server";
import { getSession, type SessionClaims } from "@/lib/auth/session";
import { getEstateById, type EstateRecord } from "@/lib/repos/estates";
import { enforceSameOriginForMutations } from "@/lib/security/same-origin";
import { requireCurrentUser } from "@/lib/auth/current-user";

export type ApiGuardResult<T> =
  | { ok: true; value: T }
  | { ok: false; response: NextResponse };

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof requireCurrentUser>>>;

export async function requireApiSession(): Promise<ApiGuardResult<SessionClaims>> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true, value: session };
}

export async function requireRoleSession(params: {
  roles: Array<SessionClaims["role"]>;
}): Promise<ApiGuardResult<SessionClaims>> {
  const res = await requireApiSession();
  if (!res.ok) return res;

  if (!params.roles.includes(res.value.role)) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return res;
}

export async function requireApiCurrentUser(): Promise<ApiGuardResult<CurrentUser>> {
  const user = await requireCurrentUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true, value: user };
}

export async function requireCurrentUserWithRoles(params: {
  roles: Array<CurrentUser["role"]>;
}): Promise<ApiGuardResult<CurrentUser>> {
  const res = await requireApiCurrentUser();
  if (!res.ok) return res;

  if (!params.roles.includes(res.value.role)) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return res;
}

export function requireCurrentUserResidentContext(user: CurrentUser): ApiGuardResult<{
  estateId: string;
  residentId: string;
}> {
  if (!user.estateId || !user.residentId) {
    return { ok: false, response: NextResponse.json({ error: "Missing resident context" }, { status: 400 }) };
  }

  return { ok: true, value: { estateId: user.estateId, residentId: user.residentId } };
}

export function requireCurrentUserEstateId(user: CurrentUser): ApiGuardResult<string> {
  if (!user.estateId) {
    return { ok: false, response: NextResponse.json({ error: "Missing estate" }, { status: 400 }) };
  }

  return { ok: true, value: user.estateId };
}

export function requireActiveEstateForCurrentUser(user: CurrentUser): ApiGuardResult<true> {
  if (user.estate?.status !== "ACTIVE") {
    return { ok: false, response: NextResponse.json({ error: "Estate suspended" }, { status: 403 }) };
  }

  return { ok: true, value: true };
}

export function enforceSameOriginOr403(req: Request): ApiGuardResult<true> {
  try {
    enforceSameOriginForMutations(req);
    return { ok: true, value: true };
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Bad origin" }, { status: 403 }) };
  }
}

export function requireEstateId(session: SessionClaims): ApiGuardResult<string> {
  if (!session.estateId) {
    return { ok: false, response: NextResponse.json({ error: "Missing estate" }, { status: 400 }) };
  }
  return { ok: true, value: session.estateId };
}

export async function requireActiveEstate(estateId: string): Promise<ApiGuardResult<EstateRecord>> {
  const estate = await getEstateById(estateId);
  if (!estate) {
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  if (estate.status !== "ACTIVE") {
    return { ok: false, response: NextResponse.json({ error: "Estate not active" }, { status: 403 }) };
  }
  return { ok: true, value: estate };
}

export async function requireEstateExists(
  estateId: string,
  options: { notFoundMessage?: string } = {},
): Promise<ApiGuardResult<EstateRecord>> {
  const estate = await getEstateById(estateId);
  if (!estate) {
    return {
      ok: false,
      response: NextResponse.json({ error: options.notFoundMessage ?? "Estate not found" }, { status: 404 }),
    };
  }
  return { ok: true, value: estate };
}

export function assertTenant(params: {
  entityEstateId?: string | null;
  sessionEstateId: string;
  notFoundMessage?: string;
}): ApiGuardResult<true> {
  if (!params.entityEstateId || params.entityEstateId !== params.sessionEstateId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: params.notFoundMessage ?? "Not found" },
        { status: 404 },
      ),
    };
  }
  return { ok: true, value: true };
}
