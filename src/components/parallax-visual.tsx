"use client";

import { useEffect, useState } from "react";

export function ParallaxVisual({
  children,
  strength = 0.06,
  className = "",
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const [shift, setShift] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setShift(Math.min(56, window.scrollY * strength));
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, [strength]);

  return (
    <div className={`gp-parallax-card ${className}`} style={{ "--gp-shift": `${shift}px` } as React.CSSProperties}>
      {children}
    </div>
  );
}
