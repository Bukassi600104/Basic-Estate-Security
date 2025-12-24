"use client";

import { useEffect } from "react";

export function PwaSwRegister({ swPath, scope }: { swPath: string; scope: string }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register(swPath, { scope }).catch(() => {
      // ignore registration failures; app still works online
    });
  }, [swPath, scope]);

  return null;
}
