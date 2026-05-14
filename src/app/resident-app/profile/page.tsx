"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Home,
  Key,
  LogOut,
  Phone,
  Settings,
  Shield,
  User,
} from "lucide-react";

type Profile = {
  userId: string;
  name: string;
  role: string;
  passwordChanged: boolean;
  houseNumber?: string;
  phone?: string;
  estateName?: string;
  verificationCode?: string;
};

export default function ResidentProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/resident/profile");
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.profile) setProfile(data.profile);
      } catch {} finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function roleLabel(role: string) {
    switch (role) {
      case "RESIDENT": return "Resident";
      case "RESIDENT_DELEGATE": return "Delegate";
      default: return role;
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-5 py-6">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-white" />
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg px-5 py-6">
        <p className="text-sm text-slate-500">Unable to load profile.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-6 text-slate-950">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Your account details</p>
      </header>

      {/* Avatar + Name */}
      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-700 text-white">
          <User className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-950">{profile.name}</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
            <Shield className="h-3 w-3" />
            {roleLabel(profile.role)}
          </span>
        </div>
      </div>

      {/* Info cards */}
      <div className="mt-4 space-y-3">
        {profile.estateName && (
          <InfoRow icon={<Building2 className="h-4 w-4" />} label="Estate" value={profile.estateName} />
        )}
        {profile.houseNumber && (
          <InfoRow icon={<Home className="h-4 w-4" />} label="House Number" value={profile.houseNumber} />
        )}
        {profile.phone && (
          <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={profile.phone} />
        )}
        {profile.verificationCode && (
          <InfoRow icon={<Key className="h-4 w-4" />} label="Verification Code" value={profile.verificationCode} />
        )}
      </div>

      {/* Phone change notice */}
      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="font-bold text-amber-900">Phone Number Changes</p>
            <p className="mt-1 text-sm text-amber-800">
              To change your registered phone number or delegate numbers, contact your estate administrator.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-3">
        <Link
          href="/resident-app/settings"
          className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white px-5 py-4 font-semibold text-slate-700 shadow-sm transition-all hover:bg-violet-50 hover:text-violet-700"
        >
          <Settings className="h-5 w-5 text-violet-700" />
          Change Password
        </Link>
        <Link
          href="/auth/sign-in"
          className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-white px-5 py-4 font-semibold text-rose-600 shadow-sm transition-all hover:bg-rose-50"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Link>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-violet-100 bg-white px-5 py-4 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-0.5 break-words font-bold text-slate-950">{value}</p>
      </div>
    </div>
  );
}
