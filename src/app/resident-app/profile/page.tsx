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
        <div className="h-8 w-32 animate-pulse rounded-lg bg-white/10" />
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/10" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg px-5 py-6">
        <p className="text-sm text-white/50">Unable to load profile.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-white">Profile</h1>
        <p className="mt-1 text-sm text-white/50">Your account details</p>
      </header>

      {/* Avatar + Name */}
      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-brand-green to-brand-green-600 text-white">
          <User className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{profile.name}</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green/10 px-2.5 py-0.5 text-xs font-bold text-brand-green">
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
      <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
          <div>
            <p className="font-bold text-amber-200">Phone Number Changes</p>
            <p className="mt-1 text-sm text-amber-300">
              To change your registered phone number or delegate numbers, contact your estate administrator.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-3">
        <Link
          href="/resident-app/settings"
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-semibold text-white/70 shadow-sm transition-all hover:bg-white/5"
        >
          <Settings className="h-5 w-5 text-white/40" />
          Change Password
        </Link>
        <Link
          href="/auth/sign-in"
          className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-white/5 px-5 py-4 font-semibold text-rose-400 shadow-sm transition-all hover:bg-rose-500/150/10"
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
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/50">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">{label}</p>
        <p className="mt-0.5 font-bold text-white">{value}</p>
      </div>
    </div>
  );
}
