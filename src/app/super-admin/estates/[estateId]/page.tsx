import Link from "next/link";
import { requireSession } from "@/lib/auth/require-session";
import { prisma } from "@/lib/db";

export default async function SuperAdminEstatePage({
  params,
}: {
  params: { estateId: string };
}) {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") return null;

  const estate = await prisma.estate.findUnique({
    where: { id: params.estateId },
  });
  if (!estate) return null;

  const validations = await prisma.validationLog.findMany({
    where: { estateId: estate.id },
    orderBy: { validatedAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/super-admin"
          className="inline-flex rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          Back to estates
        </Link>
        <div className="text-sm font-semibold text-slate-900">{estate.name}</div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold">Recent validations</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-600">
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-4 font-semibold">Time</th>
                <th className="py-2 pr-4 font-semibold">House</th>
                <th className="py-2 pr-4 font-semibold">Resident</th>
                <th className="py-2 pr-4 font-semibold">Type</th>
                <th className="py-2 pr-4 font-semibold">Decision</th>
              </tr>
            </thead>
            <tbody>
              {validations.map((v) => (
                <tr key={v.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">
                    {new Date(v.validatedAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-slate-700">{v.houseNumber}</td>
                  <td className="py-2 pr-4 text-slate-700">{v.residentName}</td>
                  <td className="py-2 pr-4 text-slate-700">{v.passType}</td>
                  <td className="py-2 pr-4 text-slate-700">{v.decision}</td>
                </tr>
              ))}
              {validations.length === 0 ? (
                <tr>
                  <td className="py-3 text-slate-600" colSpan={5}>
                    No validations yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
