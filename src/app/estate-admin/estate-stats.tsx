"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Key, Shield, Users } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";

type Stats = {
  residents: number;
  guards: number;
  activeCodes: number;
  todayValidations: number;
};

export function EstateAdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch residents count
        const residentsRes = await fetch("/api/estate-admin/residents");
        const residentsData = residentsRes.ok ? await residentsRes.json() : { residents: [] };

        // Fetch guards count
        const guardsRes = await fetch("/api/estate-admin/guards");
        const guardsData = guardsRes.ok ? await guardsRes.json() : { guards: [] };

        setStats({
          residents: residentsData.residents?.length || 0,
          guards: guardsData.guards?.length || 0,
          activeCodes: 0, // Would need additional API
          todayValidations: 0, // Would need additional API
        });
      } catch {
        setStats({
          residents: 0,
          guards: 0,
          activeCodes: 0,
          todayValidations: 0,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Residents"
        value={stats?.residents ?? 0}
        icon={Users}
        trend="Active accounts"
        loading={loading}
      />
      <StatCard
        title="Guards"
        value={stats?.guards ?? 0}
        icon={Shield}
        trend="Registered"
        loading={loading}
      />
      <StatCard
        title="Active Codes"
        value={stats?.activeCodes ?? 0}
        icon={Key}
        trend="Guest & staff"
        loading={loading}
      />
      <StatCard
        title="Today's Entries"
        value={stats?.todayValidations ?? 0}
        icon={CheckCircle}
        trend="Validated"
        loading={loading}
        variant="success"
      />
    </div>
  );
}
