"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ResidentSignInRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/auth/sign-in");
  }, [router]);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Sign-in updated</h1>
        <p className="mt-2 text-sm text-slate-600">
          Resident sign-in now uses Cognito. Redirecting to the main sign-in page…
        </p>
      </div>
    </div>
  );
}
